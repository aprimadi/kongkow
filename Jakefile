namespace('server', function () {
  desc('Start server');
  task('start', function () {
    jake.exec("supervisor -e 'hjs|js' node app.js", {printStdout: true, printStderr: true});
  });
});