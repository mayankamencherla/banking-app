/**
 * Creating a user schema
 */

exports.up = function(knex, Promise) {

    return knex.schema.createTable('user', function (t) {

        t.increments('id').primary();

        t.string('email').nullable();

        // We always create an app token on user creation
        t.string('app_token').notNullable();

        // Ideally this field must be udpated for interfacing with Truelayer API
        t.string('truelayer_access_token').nullable();

        t.string('truelayer_refresh_token').nullable();

        // Automatically add an updated_at and created_at field
        t.timestamps(false, true)
    });
};

exports.down = function(knex, Promise) {

    return knex.schema.dropTableIfExists('user');
};
