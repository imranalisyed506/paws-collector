const sinon = require('sinon');
const sandbox = sinon.createSandbox();
function mock(service, methodName, callback) {
    return sandbox.stub(service.prototype, methodName).callsFake(callback);
}

function restore(serviceName, methodName) {
    if (serviceName.prototype[methodName] && serviceName.prototype[methodName].restore) {
        serviceName.prototype[methodName].restore();
    }
}

module.exports = {
    mock: mock,
    restore: restore
};