const mongoose = require('mongoose');

/**
 * Custom error class for HTTP-aware errors within database transactions.
 */
class TransactionHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'TransactionHttpError';
    this.status = status;
  }
}

/**
 * Executes a callback function inside a MongoDB database transaction session.
 * Automatically commits on success and aborts/rollbacks on error.
 * Gracefully falls back to execution without session if MongoDB is running standalone
 * or transactions/sessions are unavailable in the current runtime environment.
 *
 * @param {Function} workFn - Async function (session) => Promise<any>
 * @returns {Promise<any>}
 */
const withTransaction = async (workFn) => {
  let session = null;
  const isMocked =
    mongoose.startSession &&
    (Boolean(mongoose.startSession.mock) || Boolean(mongoose.startSession._isMockFunction));
  const isConnected = mongoose.connection && mongoose.connection.readyState === 1;

  if (isConnected || isMocked) {
    try {
      session = await mongoose.startSession();
      if (session && typeof session.startTransaction === 'function') {
        session.startTransaction();
      }
    } catch (err) {
      session = null;
    }
  }

  if (!session) {
    return await workFn(null);
  }

  try {
    const result = await workFn(session);
    if (typeof session.inTransaction === 'function' ? session.inTransaction() : true) {
      await session.commitTransaction();
    }
    return result;
  } catch (error) {
    try {
      if (typeof session.inTransaction === 'function' ? session.inTransaction() : true) {
        await session.abortTransaction();
      }
    } catch (abortErr) {
      // Ignore secondary abort errors if transaction was already concluded
    }
    throw error;
  } finally {
    try {
      await session.endSession();
    } catch (endErr) {
      // Ignore secondary endSession errors
    }
  }
};

module.exports = {
  withTransaction,
  TransactionHttpError,
};
