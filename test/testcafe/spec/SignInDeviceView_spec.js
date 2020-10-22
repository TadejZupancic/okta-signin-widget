import { RequestLogger, RequestMock, Selector } from 'testcafe';
import SignInDevicePageObject from '../framework/page-objects/SignInDevicePageObject';
import smartProbingRequired from '../../../playground/mocks/data/idp/idx/smart-probing-required';
import launchAuthenticatorOption from '../../../playground/mocks/data/idp/idx/identify-with-device-launch-authenticator';

const logger = RequestLogger(/introspect/);

const mock = RequestMock()
  .onRequestTo('http://localhost:3000/idp/idx/introspect')
  .respond(smartProbingRequired)
  .onRequestTo('http://localhost:3000/idp/idx/authenticators/okta-verify/launch')
  .respond(launchAuthenticatorOption);

fixture('Sign in with Okta Verify is required')
  .requestHooks(logger, mock);

async function setup(t) {
  const signInDevicePageObject = new SignInDevicePageObject(t);
  await signInDevicePageObject.navigateToPage();
  return signInDevicePageObject;
}

test('shows the correct content', async t => {
  const signInDevicePage = await setup(t);
  await t.expect(signInDevicePage.getHeader()).eql('Sign In');
  await t.expect(signInDevicePage.getBeaconClass()).contains('undefined-user');
  await t.expect(signInDevicePage.getContentText()).eql('To access this resource, your organization requires you to sign in using your device.');
  await t.expect(signInDevicePage.getOVButtonLabel()).eql('Sign in using Okta Verify on this device');
  await t.expect(signInDevicePage.getEnrollFooterLinkText()).eql('Sign Up');
});

test('clicking the launch Okta Verify button takes user to the right UI', async t => {
  const signInDevicePage = await setup(t);
  await signInDevicePage.clickLaunchOktaVerifyButton();
  const header = new Selector('h2[data-se="o-form-head"]');
  await t.expect(header.textContent).eql('Sign in using Okta Verify on this device');
});
