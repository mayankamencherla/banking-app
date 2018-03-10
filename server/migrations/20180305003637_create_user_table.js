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

        // Ideally this field must be udpated for interfacing with Truelayer API
        t.text('truelayer_access_token', 'longtext').nullable();

        t.string('truelayer_refresh_token').nullable();

        // Automatically add an updated_at and created_at field
        t.timestamps(false, true);
    });
};

exports.down = function(knex, Promise) {

    return knex.schema.dropTableIfExists('user');
};
