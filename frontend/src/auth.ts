import { Store } from '@tanstack/react-store';
import {
  User,
  Log,
  UserManager,
  WebStorageStateStore,
} from 'oidc-client-ts';

const oidcConfig = {
  authority: 'https://auth.bouts.me',
  client_id: 'kubernetes',
  redirect_uri: `${window.location.origin}/callback`,
  response_type: 'code',
  scope: 'openid email profile groups',
  post_logout_redirect_uri: window.location.origin,
  userStore: new WebStorageStateStore({ store: window.localStorage })
};

export const userStore = new Store<User | null>(null)

export const userManager = new UserManager(oidcConfig);

userManager.getUser().then((user) => userStore.setState(() => user));

userStore.subscribe(() => {
  userManager.events.addUserLoaded((user) => userStore.setState(() => user));
})

userManager.events.addUserSignedOut(() => userStore.setState(() => null));

Log.setLevel(Log.DEBUG);