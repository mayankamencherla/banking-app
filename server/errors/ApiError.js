const {errormessages} = require('./ErrorMessage');

const getErrorJson = (statusCode, errorCode) => {

    return {
        http_status_code: statusCode,
        error: errorCode,
        error_message: getErrorMessage(errorCode)
    };
};

const getErrorMessage = (errorCode) => {

    return errormessages[errorCode];
};

module.exports = {getErrorJson};
