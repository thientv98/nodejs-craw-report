var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var exportRouter = require('./routes/export');
var traTenCongTyRouter = require('./routes/tratencongty');
var traTenCongTy2Router = require('./routes/tratencongty2');
var doanhNghiepMoi = require('./routes/doanhnghiepmoi');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/export', exportRouter);
app.use('/tratencongty', traTenCongTyRouter);
app.use('/tratencongty2', traTenCongTy2Router);
app.use('/doanhnghiepmoi', doanhNghiepMoi);

console.log('Listening on http://localhost:3333')

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
