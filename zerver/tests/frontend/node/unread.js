// Unit test the unread.js module, which depends on these global variables:
//
//   _, narrow, current_msg_list, home_msg_list, subs
//
// These tests are framework-free and run sequentially; they are invoked
// immediately after being defined.  The contract here is that tests should
// clean up after themselves, and they should explicitly stub all
// dependencies (except _).

add_dependencies({
    _: 'third/underscore/underscore.js',
    util: 'js/util.js',
    Dict: 'js/dict.js'
});

var stream_data = require('js/stream_data.js');

stream_data = {
    canonicalized_name: stream_data.canonicalized_name
};
set_global('stream_data', stream_data);

var Dict = global.Dict;
var unread = require('js/unread.js');
var assert = require('assert');

var narrow = {};
global.narrow = narrow;

var current_msg_list = {};
global.current_msg_list = current_msg_list;

var home_msg_list = {};
global.home_msg_list = home_msg_list;

var zero_counts = {
    private_message_count: 0,
    home_unread_messages: 0,
    mentioned_message_count: 0,
    stream_count: new Dict(),
    subject_count: new Dict(),
    pm_count: new Dict(),
    unread_in_current_view: 0
};

(function test_empty_counts_while_narrowed() {
    narrow.active = function () {
        return true;
    };
    current_msg_list.all = function () {
        return [];
    };

    var counts = unread.get_counts();
    assert.deepEqual(counts, zero_counts);
}());

(function test_empty_counts_while_home() {
    narrow.active = function () {
        return false;
    };
    current_msg_list.all = function () {
        return [];
    };

    var counts = unread.get_counts();
    assert.deepEqual(counts, zero_counts);
}());

(function test_changing_subjects() {
    // Summary: change the subject of a message from 'lunch'
    // to 'dinner' using update_unread_subjects().
    var count = unread.num_unread_for_subject('social', 'lunch');
    assert.equal(count, 0);

    var message = {
        id: 15,
        type: 'stream',
        stream: 'social',
        subject: 'lunch'
    };

    unread.process_loaded_messages([message]);

    count = unread.num_unread_for_subject('social', 'lunch');
    assert.equal(count, 1);

    var event = {
        subject: 'dinner'
    };

    unread.update_unread_subjects(message, event);

    count = unread.num_unread_for_subject('social', 'lunch');
    assert.equal(count, 0);

    count = unread.num_unread_for_subject('social', 'dinner');
    assert.equal(count, 1);

    // cleanup
    message.subject = 'dinner';
    unread.process_read_message(message);
    count = unread.num_unread_for_subject('social', 'dinner');
    assert.equal(count, 0);
}());

(function test_num_unread_for_subject() {
    // Test the num_unread_for_subject() function using many
    // messages.

    var count = unread.num_unread_for_subject('social', 'lunch');
    assert.equal(count, 0);

    var message = {
        type: 'stream',
        stream: 'social',
        subject: 'lunch'
    };

    var num_msgs = 10000;
    var i;
    for (i = 0; i < num_msgs; ++i) {
        message.id = i+1;
        unread.process_loaded_messages([message]);
    }

    count = unread.num_unread_for_subject('social', 'lunch');
    assert.equal(count, num_msgs);

    for (i = 0; i < num_msgs; ++i) {
        message.id = i+1;
        unread.process_read_message(message);
    }

    count = unread.num_unread_for_subject('social', 'lunch');
    assert.equal(count, 0);
}());


(function test_home_messages() {
    narrow.active = function () {
        return false;
    };
    stream_data.is_subscribed = function () {
        return true;
    };
    stream_data.in_home_view = function () {
        return true;
    };

    var message = {
        id: 15,
        type: 'stream',
        stream: 'social',
        subject: 'lunch'
    };

    home_msg_list.get = function (msg_id) {
        return (msg_id === '15') ? message : undefined;
    };

    var counts = unread.get_counts();
    assert.equal(counts.home_unread_messages, 0);

    unread.process_loaded_messages([message]);

    counts = unread.get_counts();
    assert.equal(counts.home_unread_messages, 1);
    unread.process_read_message(message);
    counts = unread.get_counts();
    assert.equal(counts.home_unread_messages, 0);
}());

(function test_private_messages() {
    narrow.active = function () {
        return false;
    };
    stream_data.is_subscribed = function () {
        return true;
    };

    var counts = unread.get_counts();
    assert.equal(counts.private_message_count, 0);

    var message = {
        id: 15,
        type: 'private'
    };

    unread.process_loaded_messages([message]);

    counts = unread.get_counts();
    assert.equal(counts.private_message_count, 1);
    unread.process_read_message(message);
    counts = unread.get_counts();
    assert.equal(counts.private_message_count, 0);
}());


(function test_mentions() {
    narrow.active = function () {
        return false;
    };
    stream_data.is_subscribed = function () {
        return true;
    };

    var counts = unread.get_counts();
    assert.equal(counts.mentioned_message_count, 0);

    var message = {
        id: 15,
        type: 'stream',
        stream: 'social',
        subject: 'lunch',
        mentioned: true
    };

    unread.process_loaded_messages([message]);

    counts = unread.get_counts();
    assert.equal(counts.mentioned_message_count, 1);
    unread.process_read_message(message);
    counts = unread.get_counts();
    assert.equal(counts.mentioned_message_count, 0);
}());

(function test_declare_bankruptcy() {
    unread.declare_bankruptcy();

    var counts = unread.get_counts();
    assert.deepEqual(counts, zero_counts);
}());

(function test_num_unread_current_messages() {
    var count = unread.num_unread_current_messages();
    assert.equal(count, 0);

    var message = {
        id: 15
    };
    current_msg_list.all = function () {
        return [message];
    };

    // It's a little suspicious that num_unread_current_messages()
    // is using the pointer as a hint for filtering out unread
    // messages, but right now, it's impossible for unread messages
    // to be above the pointer in a narrowed view, so unread.js uses
    // this for optimization purposes.
    current_msg_list.selected_id = function () {
        return 11; // less than our message's id
    };

    count = unread.num_unread_current_messages();
    assert.equal(count, 1);
}());

