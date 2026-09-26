const mongoose = require('mongoose');
const { withTransaction, TransactionHttpError } = require('../src/utils/transaction');

describe('Database Transaction Utility Tests', () => {
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(true),
      abortTransaction: jest.fn().mockResolvedValue(true),
      endSession: jest.fn().mockResolvedValue(true),
      inTransaction: jest.fn().mockReturnValue(true),
    };
  });

  it('should instantiate TransactionHttpError with status and message', () => {
    const err = new TransactionHttpError(400, 'Concurrent conflict');
    expect(err.name).toBe('TransactionHttpError');
    expect(err.status).toBe(400);
    expect(err.message).toBe('Concurrent conflict');
  });

  it('should successfully execute workFn inside transaction, commit, and end session', async () => {
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

    const workFn = jest.fn().mockResolvedValue('success_result');

    const result = await withTransaction(workFn);

    expect(mongoose.startSession).toHaveBeenCalled();
    expect(mockSession.startTransaction).toHaveBeenCalled();
    expect(workFn).toHaveBeenCalledWith(mockSession);
    expect(mockSession.commitTransaction).toHaveBeenCalled();
    expect(mockSession.abortTransaction).not.toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalled();
    expect(result).toBe('success_result');
  });

  it('should abort transaction and end session when workFn throws an error', async () => {
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

    const customError = new TransactionHttpError(409, 'Concurrent transaction conflict');
    const workFn = jest.fn().mockRejectedValue(customError);

    await expect(withTransaction(workFn)).rejects.toThrow('Concurrent transaction conflict');

    expect(mockSession.startTransaction).toHaveBeenCalled();
    expect(mockSession.abortTransaction).toHaveBeenCalled();
    expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalled();
  });

  it('should fall back gracefully to workFn(null) when startSession throws (e.g. standalone Mongo)', async () => {
    jest.spyOn(mongoose, 'startSession').mockRejectedValue(new Error('Transaction numbers are only allowed on a replica set member'));

    const workFn = jest.fn().mockResolvedValue('fallback_result');

    const result = await withTransaction(workFn);

    expect(workFn).toHaveBeenCalledWith(null);
    expect(result).toBe('fallback_result');
  });
});
