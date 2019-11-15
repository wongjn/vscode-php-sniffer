module.exports = {
  env: {
    mocha: true,
  },
  rules: {
    // Reduce verbosity of function callbacks.
    'func-names': 0,
    // Mocha needs function callbacks for `this`.
    'prefer-arrow-callback': 0,
  },
};
