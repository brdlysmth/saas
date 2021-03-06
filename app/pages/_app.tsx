import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/styles';
import { Provider } from 'mobx-react';
import App from 'next/app';
import React from 'react';
import { getInitialDataApiMethod } from '../lib/api/team-member';

import { themeDark, themeLight } from '../lib/theme';
import { getUserApiMethod } from '../lib/api/public';
import { isMobile } from '../lib/isMobile';
import { getStore, initializeStore, Store } from '../lib/store';

class MyApp extends App<{ isMobile: boolean }> {
  public static async getInitialProps({ Component, ctx }) {
    let firstGridItem = true;
    let teamRequired = false;

    if (
      ctx.pathname.includes('/login') ||
      ctx.pathname.includes('/create-team') ||
      ctx.pathname.includes('/invitation')
    ) {
      firstGridItem = false;
    }

    if (
      ctx.pathname.includes('/team-settings') ||
      ctx.pathname.includes('/discussion') ||
      ctx.pathname.includes('/billing')
    ) {
      teamRequired = true;
    }

    const { teamSlug, redirectMessage, discussionSlug } = ctx.query;
    console.log(`ctx.query.teamSlug: ${teamSlug}`);

    const pageProps = {
      isMobile: isMobile({ req: ctx.req }),
      firstGridItem,
      teamRequired,
      teamSlug,
      redirectMessage,
      discussionSlug,
    };

    if (Component.getInitialProps) {
      Object.assign(pageProps, await Component.getInitialProps(ctx));
    }

    const appProps = { pageProps };

    const store = getStore();
    if (store) {
      return appProps;
    }

    const { req } = ctx;

    const headers: any = {};
    if (req.headers && req.headers.cookie) {
      headers.cookie = req.headers.cookie;
    }

    let userObj = null;
    try {
      const { user } = await getUserApiMethod({ headers });
      userObj = user;
    } catch (error) {
      console.log(error);
    }

    let initialData = {};
    if (userObj) {
      try {
        initialData = await getInitialDataApiMethod({
          request: ctx.req,
          data: { teamSlug, discussionSlug },
        });
      } catch (error) {
        console.error(error);
      }
    }

    return {
      ...appProps,
      initialState: { user: userObj, currentUrl: ctx.asPath, teamSlug, ...initialData },
    };
  }

  public componentDidMount() {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles && jssStyles.parentNode) {
      jssStyles.parentNode.removeChild(jssStyles);
    }
  }

  private store: Store;

  constructor(props) {
    console.log('MyApp.constructor');

    super(props);

    this.store = initializeStore(props.initialState);
  }

  public render() {
    const { Component, pageProps } = this.props;
    const store = this.store;
    console.log(store.currentUser);

    return (
      <ThemeProvider
        theme={store.currentUser && store.currentUser.darkTheme ? themeDark : themeLight}
      >
        <CssBaseline />
        <Provider store={store}>
          <Component {...pageProps} store={store} />
        </Provider>
      </ThemeProvider>
    );
  }
}

/**
 * Notes:
 * - more info on baseline styles:
 *  - https://material-ui.com/components/css-baseline/#css-baseline
 *  - https://github.com/necolas/normalize.css/blob/master/normalize.css
 */
export default MyApp;
