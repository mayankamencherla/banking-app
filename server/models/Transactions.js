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

    // TODO: See if there's a better way to handle duplicates
    return getTransactionRowsToSaveToDb(transactions, accountId, userId)
            .then((rows) => {

                logger.info({
                    code: tracecodes.SAVE_TRANSACTIONS_REQUEST,
                    rows: rows
                });

                return knex.batchInsert('transactions', rows, 10000)
                           .then(() => {

                               return Promise.resolve(rows);
                           });
            });
};

/**
 * Runs through the entire transactions array, pulls out relevant
 * information and then filters the transactions that have already
 * been saved in the DB so that duplication is avoided.
 */
const getTransactionRowsToSaveToDb = (transactions, accountId, userId) => {

    var rows = _.map(transactions, (transaction) => {

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

    const transactionIds = _.map(rows, (transaction) => {

                                var result = _.pick(transaction, 'transaction_id');

                                return result.transaction_id;
                           });

    return knex('transactions')
            .select('transaction_id')
            .whereIn('transaction_id', transactionIds)
            .then((savedTransactions) => {

                savedTransactions = savedTransactions.map(transaction => transaction.transaction_id);

                // We don't want to insert transaction_ids that
                // are already inserted into the DB
                return _.filter(rows, (item) => {

                            return !savedTransactions.includes(item.transaction_id);
                        });
        });
};

module.exports.Transactions = {
    saveTransactions,
};
