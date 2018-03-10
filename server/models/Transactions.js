const knex                           = require('knex')(require('./../knexfile'));
const {logger}                       = require('@log/logger');
const {tracecodes}                   = require('@tracecodes');

const _                              = require('lodash');

/**
 * Transactions is an object containining account_id and
 * transactions of the account id. We will save this into
 * the DB, with the relevant values plucked from the object.
 *
 * @param transactions
 * @param userId
 */
const saveTransactions = (transactions, accountId, userId) => {

    if (typeof transactions === 'undefined') {

        return Promise.reject();
    }

    logger.info({
        code: tracecodes.SAVE_TRANSACTIONS_REQUEST,
        transactions: transactions,
        account_id: accountId,
        user_id: userId
    });

    const rows = getTransactionRowsToSaveToDb(transactions, accountId, userId);

    // TODO: This seems pretty sub-optimal
    // There must surely be a way to get txn if from the call above
    const ids = _.map(rows, _.partialRight(_.pick, 'transaction_id'));

    return knex.batchInsert('transactions', rows, 10000)
               .whereNotExists(() => {
                    return this.select(Knex.raw(1))
                               .from('transactions')
                               // TODO: How on earth do I pick transactionIDs here??
                               .whereIn('transaction_id', ids);
               })
               .then(() => {

                   return Promise.resolve(rows);
               });
};

const getTransactionRowsToSaveToDb = (transactions, accountId, userId) => {

    return _.map(transactions, (transaction) => {

        var result = _.pick(transaction, [
                        'transaction_type',
                        'transaction_category',
                        'amount',
                        'currency',
                        'transaction_id',
                        'timestamp',
                        'description',
                    ]);

        result.account_id = accountId;

        result.user_id = userId;

        return result;
    });
};

module.exports.Transactions = {
    saveTransactions,
};
