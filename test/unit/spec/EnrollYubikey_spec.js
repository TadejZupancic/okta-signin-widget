import getAuthClient from 'widget/getAuthClient';
import Router from 'LoginRouter';
import Beacon from 'helpers/dom/Beacon';
import Form from 'helpers/dom/EnrollTokenFactorForm';
import Util from 'helpers/mocks/Util';
import Expect from 'helpers/util/Expect';
import resAllFactors from 'helpers/xhr/MFA_ENROLL_allFactors';
import resSuccess from 'helpers/xhr/SUCCESS';
import $sandbox from 'sandbox';
const itp = Expect.itp;
const tick = Expect.tick;

Expect.describe('EnrollYubikey', function() {
  function setup(startRouter) {
    const setNextResponse = Util.mockAjax();
    const baseUrl = 'https://foo.com';
    const authClient = getAuthClient({
      authParams: { issuer: baseUrl }
    });
    const router = new Router({
      el: $sandbox,
      baseUrl: baseUrl,
      authClient: authClient,
      'features.router': startRouter,
    });

    Util.registerRouter(router);
    Util.mockRouterNavigate(router, startRouter);

    const test = {
      router: router,
      beacon: new Beacon($sandbox),
      form: new Form($sandbox),
      ac: authClient,
      setNextResponse: setNextResponse,
    };

    const enrollYubikey = test => {
      setNextResponse(resAllFactors);
      router.refreshAuthState('dummy-token');
      return Expect.waitForEnrollChoices(test).then(function(test) {
        router.enrollYubikey();
        return Expect.waitForEnrollYubikey(test);
      });
    };

    if (startRouter) {
      return Expect.waitForPrimaryAuth(test).then(enrollYubikey);
    } else {
      return enrollYubikey(test);
    }
  }

  Expect.describe('Header & Footer', function() {
    itp('displays the correct factorBeacon', function() {
      return setup().then(function(test) {
        expect(test.beacon.isFactorBeacon()).toBe(true);
        expect(test.beacon.hasClass('mfa-yubikey')).toBe(true);
      });
    });
    itp('has a "back" link in the footer', function() {
      return setup().then(function(test) {
        Expect.isVisible(test.form.backLink());
      });
    });
  });

  Expect.describe('Enroll factor', function() {
    itp('has passCode field', function() {
      return setup().then(function(test) {
        Expect.isPasswordField(test.form.codeField());
      });
    });
    itp('has a verify button', function() {
      return setup().then(function(test) {
        Expect.isVisible(test.form.submitButton());
      });
    });
    itp('does not allow autocomplete', function() {
      return setup().then(function(test) {
        expect(test.form.getCodeFieldAutocomplete()).toBe('off');
      });
    });
    itp('returns to factor list when browser\'s back button is clicked', function() {
      return setup(true)
        .then(function(test) {
          Util.triggerBrowserBackButton();
          return Expect.waitForEnrollChoices(test);
        })
        .then(function(test) {
          Expect.isEnrollChoices(test.router.controller);
          Util.stopRouter();
        });
    });
    itp('does not send request and shows error if code is not entered', function() {
      return setup().then(function(test) {
        Util.resetAjaxRequests();
        test.form.submit();
        expect(test.form.hasErrors()).toBe(true);
        expect(Util.numAjaxRequests()).toBe(0);
      });
    });
    itp('calls enroll with the right params', function() {
      return setup()
        .then(function(test) {
          Util.resetAjaxRequests();
          test.form.setCode(123456);
          test.setNextResponse(resSuccess);
          test.form.submit();
          return tick();
        })
        .then(function() {
          expect(Util.numAjaxRequests()).toBe(1);
          Expect.isJsonPost(Util.getAjaxRequest(0), {
            url: 'https://foo.com/api/v1/authn/factors',
            data: {
              factorType: 'token:hardware',
              provider: 'YUBICO',
              passCode: '123456',
              stateToken: 'testStateToken',
            },
          });
        });
    });
  });
});
