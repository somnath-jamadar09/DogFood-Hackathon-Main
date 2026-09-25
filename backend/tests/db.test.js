const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

describe('MongoDB Connection Module Tests', () => {
  let connectSpy;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (connectSpy) {
      connectSpy.mockRestore();
    }
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should successfully connect to MongoDB on the first attempt', async () => {
    const mockConnection = { connection: { host: 'localhost:27017' } };
    connectSpy = jest.spyOn(mongoose, 'connect').mockResolvedValue(mockConnection);

    const conn = await connectDB(5, 50);

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(conn).toEqual(mockConnection);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Database] MongoDB Connected: localhost:27017')
    );
  });

  it('should retry connection on failure with backoff and succeed on subsequent attempt', async () => {
    const mockConnection = { connection: { host: 'mongodb:27017' } };
    let attempts = 0;
    connectSpy = jest.spyOn(mongoose, 'connect').mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Connection refused');
      }
      return mockConnection;
    });

    const conn = await connectDB(5, 50);

    expect(connectSpy).toHaveBeenCalledTimes(3);
    expect(conn).toEqual(mockConnection);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Connection attempt 1/5 failed')
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Connection attempt 2/5 failed')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Database] MongoDB Connected: mongodb:27017')
    );
  });

  it('should exhaust max retries (5) and throw an error when connection continues to fail', async () => {
    connectSpy = jest.spyOn(mongoose, 'connect').mockRejectedValue(
      new Error('ETIMEDOUT')
    );

    await expect(connectDB(5, 50)).rejects.toThrow('ETIMEDOUT');
    expect(connectSpy).toHaveBeenCalledTimes(5);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Max retries (5) reached')
    );
  });

  it('should cleanly disconnect via disconnectDB', async () => {
    const closeSpy = jest.spyOn(mongoose.connection, 'close').mockResolvedValue();

    await connectDB.disconnectDB();

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Database] MongoDB disconnected cleanly')
    );

    closeSpy.mockRestore();
  });
});
