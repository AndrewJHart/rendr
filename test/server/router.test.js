/*global describe, it, beforeEach */

var Router, config, should, express, _, sinon;

should = require('should');
Router = require('../../server/router');
express = require('express');
_ = require('underscore');
sinon = require('sinon');

config = {
  paths: {
    entryPath: __dirname + "/../fixtures"
  }
};

function shouldMatchRoute(actual, expected) {
  actual.should.be.an.instanceOf(Array);
  actual.slice(0, 2).should.eql(expected);
  actual[2].should.be.an.instanceOf(Function);
}

describe("server/router", function() {

  beforeEach(function() {
    this.router = new Router(config);
  });

  describe("route", function() {
    it("should add basic route definitions", function() {
      var route;
      route = this.router.route("test", "test#index");
      shouldMatchRoute(route, [
        '/test', {
          controller: 'test',
          action: 'index'
        }
      ]);
    });

    it("should support leading slash in pattern", function() {
      var route;

      route = this.router.route("/test", "test#index");
      return shouldMatchRoute(route, [
        '/test', {
          controller: 'test',
          action: 'index'
        }
      ]);
    });

    it("should support object as second argument", function() {
      var route;

      route = this.router.route("/test", {
        controller: 'test',
        action: 'index',
        role: 'admin'
      });
      shouldMatchRoute(route, [
        '/test', {
          controller: 'test',
          action: 'index',
          role: 'admin'
        }
      ]);
    });

    it("should support string as second argument, object as third argument", function() {
      var route;

      route = this.router.route("/test", "test#index", {
        role: 'admin'
      });
      shouldMatchRoute(route, [
        '/test', {
          controller: 'test',
          action: 'index',
          role: 'admin'
        }
      ]);
    });

    it("should support `redirect` option", function() {
      var route = this.router.route("/test", {
        redirect: '/foo'
      });
      shouldMatchRoute(route, [
        '/test', {
          redirect: '/foo'
        }
      ]);
    });
  });

  describe("routes", function() {
    it("should return the aggregated routes", function() {
      var routes;

      this.router.route("users/:id", "users#show");
      routes = this.router.routes();
      routes.length.should.eql(1);
      shouldMatchRoute(routes[0], [
        '/users/:id', {
          controller: 'users',
          action: 'show'
        }
      ]);
      this.router.route("users/login", "users#login");
      routes = this.router.routes();
      routes.length.should.eql(2);
      shouldMatchRoute(routes[0], [
        '/users/:id', {
          controller: 'users',
          action: 'show'
        }
      ]);
      shouldMatchRoute(routes[1], [
        '/users/login', {
          controller: 'users',
          action: 'login'
        }
      ]);
    });

    it("should return a copy of the routes, not a reference", function() {
      var routes;

      this.router.route("users/:id", "users#show");
      routes = this.router.routes();

      // Modify the routes array
      routes.push('foo');
      this.router.routes().length.should.eql(1);

      // Also modify an individual route element
      this.router.routes()[0].length.should.eql(3);
      this.router.routes()[0].shift();
      this.router.routes()[0].length.should.eql(3);
    });

    it("should not throw error without routes", function() {
      this.router.routes().length.should.eql(0);
    });
  });

  describe("buildRoutes", function() {
    it("should build route definitions based on routes file", function() {
      var routes;

      this.router.buildRoutes();
      routes = this.router.routes();
      routes.length.should.eql(3);
      shouldMatchRoute(routes[0], [
        '/users/login', {
          controller: 'users',
          action: 'login'
        }
      ]);
      shouldMatchRoute(routes[1], [
        '/users/:id', {
          controller: 'users',
          action: 'show'
        }
      ]);
      shouldMatchRoute(routes[2], [
        '/test', {
          controller: 'test',
          action: 'index'
        }
      ]);
    });
  });

  describe("match", function() {
    it("should return the route info for a matched path, no leading slash", function() {
      var route;

      this.router.route("/users/:id", "users#show");
      route = this.router.match('users/1234');
      shouldMatchRoute(route, [
        '/users/:id', {
          controller: 'users',
          action: 'show'
        }
      ]);
    });

    it("should return the route info for a matched path, with leading slash", function() {
      var route;

      this.router.route("/users/:id", "users#show");
      route = this.router.match('/users/1234');
      shouldMatchRoute(route, [
        '/users/:id', {
          controller: 'users',
          action: 'show'
        }
      ]);
    });

    it("should return null if no match", function() {
      should.not.exist(this.router.match('abcd1234xyz'));
    });

    it("should match in the right order", function() {
      var route;

      this.router.route("/users/login", "users#login");
      this.router.route("/users/:id", "users#show");
      route = this.router.match('users/thisisaparam');
      shouldMatchRoute(route, [
        '/users/:id', {
          controller: 'users',
          action: 'show'
        }
      ]);
      route = this.router.match('users/login');
      shouldMatchRoute(route, [
        '/users/login', {
          controller: 'users',
          action: 'login'
        }
      ]);
    });
  });

  describe("getParams", function() {
    beforeEach(function() {
      this.req = express.request;

      resetProperties(this.req, {
        query: {},
        route: {keys: [], params: {}}
      });
      this.router.getParams(this.req).should.eql({});
    });

    it("should return basic query params", function() {
      this.req.__defineGetter__('query', function() {
        return {foo: 'bar', bam: 'baz'};
      });
      this.router.getParams(this.req).should.eql({foo: 'bar', bam: 'baz'});
    });

    it("should support route params", function() {
      this.req.__defineGetter__('route', function() {
        return {
          keys: [{name: 'id'}, {name: 'login'}],
        };
      });
      this.req.__defineGetter__('params', function() {
        return {
          id: 'id-value',
          login: 'login-value'
        }
      });
      this.router.getParams(this.req).should.eql({
        id: 'id-value',
        login: 'login-value'
      });
    });

    it("should support both together", function() {
      this.req.__defineGetter__('query', function() {
        return {foo: 'bar', bam: 'baz'};
      });

      this.req.__defineGetter__('route', function() {
        return {
          keys: [{name: 'id'}, {name: 'login'}],
        };
      });
      this.req.__defineGetter__('params', function() {
        return {
          id: 'id-value',
          login: 'login-value'
        }
      });

      this.router.getParams(this.req).should.eql({
        foo: 'bar',
        bam: 'baz',
        id: 'id-value',
        login: 'login-value'
      });
    });

    it("should XSS sanitize params", function() {
      this.req.__defineGetter__('query', function() {
        return {foo: '<script>alert("foo")</script>'};
      });

      this.router.getParams(this.req).should.eql({
        foo: '[removed]alert&#40;"foo"&#41;[removed]'
      });
    });
  });

  describe("getHandler", function () {
    beforeEach(function () {
      var rendrApp = {},
          expressRoute = {
            keys: [ { name: 'id' } ]
          }
          params = { id: 1 };

      this.router = new Router(config);
      this.pattern = '/users/:id';
      this.req = { route: expressRoute, params: params, rendrApp: rendrApp };
    });

    it("should return a middleware function that calls the action with the correct context", function () {
      var rendrApp = this.req.rendrApp,
          rendrRoute = { controller: 'users', action: 'show' },
          res = { render: sinon.spy(), redirect: sinon.spy() },
          handler;

        handler = this.router.getHandler(function (params, callback) {
          params.should.eql({ id: 1 });
          this.currentRoute.should.equal(rendrRoute);
          this.app.should.equal(rendrApp);
          this.redirectTo.should.have.type('function');
          callback(null, 'template/path', { some: 'data' });
        }, this.pattern, rendrRoute);

        handler(this.req, res);

        res.render.calledOnce.should.be.ok;
        res.render.firstCall.args[0].should.equal('template/path');
        res.render.firstCall.args[1].should.eql({
          locals: { some: 'data' },
          app: this.req.rendrApp,
          req: this.req
        });
    });

    describe('redirectTo', function () {
      it("should redirect to another page", function () {
        var rendrApp = this.req.rendrApp,
            rendrRoute = { controller: 'users', action: 'show' },
            res = { redirect: sinon.spy() },
            handler;

          handler = this.router.getHandler(function (params, callback) {
            this.redirectTo('/some_uri')
          }, this.pattern, rendrRoute);

          handler(this.req, res);

          res.redirect.calledOnce.should.be.ok;
          res.redirect.firstCall.args.should.eql(['/some_uri']);
          res.redirect.firstCall.thisValue.should.equal(res);
      });

      it("should redirect to another page using a specific http status code", function () {
        var rendrApp = this.req.rendrApp,
            rendrRoute = { controller: 'users', action: 'show' },
            res = { redirect: sinon.spy() },
            handler;

          handler = this.router.getHandler(function (params, callback) {
            this.redirectTo(301, '/some_uri');
          }, this.pattern, rendrRoute);

          handler(this.req, res);

          res.redirect.calledOnce.should.be.ok;
          res.redirect.firstCall.args.should.eql([301, '/some_uri']);
          res.redirect.firstCall.thisValue.should.equal(res);
      });
    });
  });
});

function resetProperties(obj, properties) {
  _.each(properties, function(value, key) {
    obj.__defineGetter__(key, function() {
      return value;
    });
  });
}
