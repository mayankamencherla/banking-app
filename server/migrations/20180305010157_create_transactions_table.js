/**
 * Creating a transactions schema
 */

/**
 * Creating the columns based on the documentation
 *
 * @see http://docs.truelayer.com/#retrieve-account-transactions
 */
exports.up = function(knex, Promise) {

    return knex.schema.createTable('transactions', function (t) {

        t.increments('id').primary();

        // To pull out transactions by user id
        t.string('user_id').notNullable();

        // Each transaction has to belong to an account_id
        t.string('account_id').notNullable();

        // Unique ID of the transaction
        t.string('transaction_id').notNullable().unique();

        // Timestamp of when the transaction was authorized
        t.string('timestamp').notNullable();

        t.string('description').nullable();

        t.string('transaction_type').notNullable();

        t.string('transaction_category').notNullable();

        t.string('amount').notNullable();

        t.string('currency').notNullable();

        // Automatically add an updated_at and created_at field
        t.timestamps(false, true);

        t.index('account_id');

        t.index('transaction_id');
    });
};

exports.down = function(knex, Promise) {

    return knex.schema.dropTableIfExists('transactions');
};
