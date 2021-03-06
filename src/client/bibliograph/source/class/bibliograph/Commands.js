/* ************************************************************************

  Bibliograph. The open source online bibliographic data manager

  http://www.bibliograph.org

  Copyright:
    2018 Christian Boulanger

  License:
    MIT license
    See the LICENSE file in the project's top-level directory for details.

  Authors:
    Christian Boulanger (@cboulanger) info@bibliograph.org

************************************************************************ */

/**
 * This singleton class contains the commands that can be executed in menus and buttons.
 * Call them via qx.core.Init.getApplication().cmd("methodName",arg)
 *
 */
qx.Class.define("bibliograph.Commands",
{
  extend : qx.core.Object,
  include : [qcl.ui.MLoadingPopup, qx.locale.MTranslation],
  type : "singleton",
  members :
  {
    /*
    ---------------------------------------------------------------------------
       AFTER_LOGIN & AFTER_LOGOUT
    ---------------------------------------------------------------------------
    */

    /**
     * Called when the user presses the "login" button
     *
     * @param value
     * @param app
     */
    showLoginDialog : async function(value, app) {
      // check if https login is enforced
      let l= window.location;
      var enforce_https = app.getConfigManager().getKey("access.enforce_https_login");
      if (enforce_https && l.protocol !== "https:") {
        let msg = this.tr("To log in, you need a secure connection. After you press 'OK', the application will be reloaded in secure mode. After the application finished loading, you can log in again.");
        await this.getApplication().alert(msg);
        l.href = "https://" + l.host + l.pathname + l.hash;
      } else {
        // check if access is restricted
        // if ( app.getConfigManager().getKey("bibliograph.access.mode" ) == "readonly" &&
        //   !this.__readonlyConfirmed) {
        //   var msg = this.tr("The application is currently in a read-only state. Only the administrator can log in.");
        //   var explanation = this.getConfigManager().getKey("bibliograph.access.no-access-message");
        //   if (explanation) {
        //     msg += "\n" + explanation;
        //   }
        //   await this.getApplication().alert(msg);
        //   this.__readonlyConfirmed = true
        // } else {
          // else show login dialog
          app.getWidgetById("app/windows/login").show();
        //}
      }
    },

    /**
     * called when user clicks on the "forgot password?" button
     *
     * @param data
     * @param app
     */
    forgotPassword : async function(data, app) {
      app.showPopup(this.tr("Please wait ..."));
      await app.getApplication().getRpcClient("actool").send("resetPasswordDialog");
      app.hidePopup();
    },
    
    /**
     * Log out current user on the server
     *
     * @return {Promise<Object>}
     * @param data
     * @param app
     */
    logout : async function(data, app) {
      if (!app) {
       app = this.getApplication();
      }
      qx.core.Id.getQxObject("toolbar/logout-button").setEnabled(false);
      app.createPopup();
      app.showPopup(this.tr("Logging out ..."));
      // reset datasource
      try {
        app.setDatasource(null);
      } catch (e) {}
      // remove state
      app.setFolderId(null);
      app.setModelId(null);
      // logout
      await app.getAccessManager().logout();
      qx.core.Id.getQxObject("toolbar/logout-button").setEnabled(true);
      app.hidePopup();
    },

   /*
    ---------------------------------------------------------------------------
       Toolbar commands
    ---------------------------------------------------------------------------
    */

    /**
     * opens a window with the online help
     *
     * @param path
     */
    showHelpWindow : async function(path="") {
      let locale = qx.locale.Manager.getInstance().getLocale().slice(0, 2);
      let sites_root = "https://sites.google.com/bibliograph.org/docs-v3-";
      let url = sites_root + locale + "/" + (path||"");
      this.__helpWindow = window.open(url, "bibliograph-help-window");
      if (!this.__helpWindow) {
        await this.getApplication().alert(this.tr("Cannot open window. Please disable the popup-blocker of your browser for this website."));
        return;
      }
      this.__helpWindow.focus();
    },

    /**
     * Shows the "about" window
     *
     * @param data
     * @param app
     */
    showAboutWindow : function(data, app) {
      qx.core.Id.getQxObject("windows/about").open();
    },
  
    /**
     * Edit the data of the current user
     * @param data
     * @param app
     * @return {Promise<void>}
     */
    editUserData : async function(data, app) {
      var activeUser = app.getAccessManager().getActiveUser();
      if (activeUser.getEditable()) {
        app.showPopup(this.tr("Retrieving user data..."));
        await rpc.AccessConfig.edit("user", activeUser.getNamedId());
        app.hidePopup();
      }
    },

    /*
    ---------------------------------------------------------------------------
       HELPER METHODS
    ---------------------------------------------------------------------------
    */
    
    /**
     * Prints the content of the given dom element, by opening up a new window,
     * copying the content of the element to this new window, and starting the
     * print.
     *
     * @param domElement {Element}
     * @param app
     * @ignore(Element)
     */
    print : function(domElement, app) {
      if (!(domElement instanceof Element)) {
        this.error("print() takes a DOM element as argument");
        return;
      }
      var win = window.open();
      win.document.open();
      win.document.write(domElement.innerHTML);
      win.document.close();
      win.print();
    },



    endOfFile : true
  },

  /**
   * Setup event listeners in the defer function by iterating through the member methods
   * and setting up up a message subscriber for "bibliograph.command.{method name}".
   * When the message is dispatched, the method is called with the signature
   * ({mixed} messageData, {qx.application.Standalone} app)
   *
   * @param statics
   * @param members
   * @param properties
   */
  defer: function(statics, members, properties) {
    // todo figure out automatically
    const methodNames = [
      "showLoginDialog",
      "forgotPassword",
      "logout",
      "showHelpWindow",
      "showAboutWindow",
      "editUserData",
      "print"
    ];
    for (let methodName of methodNames) {
      qx.event.message.Bus.subscribe("bibliograph.command." + methodName, e => {
        try {
          let maybePromise = bibliograph.Commands.getInstance()[methodName](e.getData(), qx.core.Init.getApplication());
          if (maybePromise instanceof Promise || maybePromise instanceof qx.Promise) {
            (async () => {
              await maybePromise;
            })();
          }
        } catch (e) {
          throw new Error(`Exception raised during call to bibliograph.command.${methodName}():${e}`);
        }
      });
    }
  }
});
