/**
 * Creating a user schema
 */

exports.up = function(knex, Promise) {

    return knex.schema.createTable('user', function (t) {

        // A unique object to identify the user
        // We generate uuid's as primary keys for every user
        t.string('id').primary();

        // We always create an app token on user creation
        t.string('app_token').notNullable();

        t.text('truelayer_access_token', 'mediumtext').nullable();

        t.string('truelayer_refresh_token').nullable();

        // Automatically add an updated_at and created_at field
        t.timestamps(false, true);

        t.index('app_token');
    });
};

exports.down = function(knex, Promise) {

    return knex.schema.dropTableIfExists('user');
};
