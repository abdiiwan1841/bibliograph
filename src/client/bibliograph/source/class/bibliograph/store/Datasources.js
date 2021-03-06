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
 * This class manages the datasources that the user has access to
 */
qx.Class.define("bibliograph.store.Datasources",
{
  extend : qcl.data.store.JsonRpcStore,
  include : [],
  type : "singleton",
  
  statics: {
    /**
     * Returns the name of the service that executes methods for the given
     * data model type
     * @param {String} type
     * @return {Promise<String>}
     */
    async getServiceFor(type) {
      if (!this.getInstance().getSelected()) {
        await new Promise(resolve =>
          this.getInstance().addListenerOnce("changeSelected", resolve));
      }
      return this.getInstance().getSelected().getServices().get(type).getService();
    }
  },
  
  construct : function() {
    this.base(arguments, "datasource");
    let bus = qx.event.message.Bus.getInstance();
    bus.subscribe("datasources.reload", this.reload, this);
    bus.subscribe(bibliograph.AccessManager.messages.AFTER_LOGIN, () => this.load());
    this.getApplication().addListener("changeDatasource", async e => {
      let datasourceId = e.getData();
      if (!datasourceId) {
        return;
      }
      await new Promise(resolve => {
        this.getModel() ? resolve() : this.addListenerOnce("changeModel", resolve);
      });
      this.setSelected(this.getById(datasourceId));
    });
  },
  
  properties: {
    selected: {
      check: "qx.core.Object",
      event: "changeSelected",
      nullable: true
    }
  },
  
  members : {
    _applyModel : function(data, old) {
      // call overriddden method
      this.base(arguments, data, old);
      let app = this.getApplication();
      let datasourceCount = qx.lang.Type.isObject(data) ? data.length : 0;
      this.info("User has access to " + datasourceCount + " datasources.");
      
      // show datasource button depending on whether there is a choice
      qx.core.Id.getQxObject("toolbar/datasource-button").setVisibility(
        datasourceCount > 1 ? "visible" : "excluded"
      );

      // if we have no datasource loaded, no access
      if (datasourceCount === 0 /*&& !this.__loggingout*/) {
        // if (!this.getApplication().getActiveUser() || !this.getApplication().getActiveUser().isAnonymous()) {
        //   this.__loggingout = true;
        //   this.getApplication().getCommands().logout();
        return;
      }
      //this.__loggingout = false;

      // if there is one saved in the application state, and we have access, use this
      let datasource = app.getStateManager().getState("datasource");
      let found=false;
      data.forEach(item => {
        if (item.getValue() === datasource) {
         found=item;
        }
      });
      if (datasource && found) {
        app.getStateManager().updateState();
        return;
      }

      // if we have access to exactly one datasource, load this one
      if (datasourceCount === 1) {
        let item = data.getItem(0);
        app.setDatasource(item.getValue());
        app.getStateManager().updateState();
      } else {
        // else, we have a choice of datasource
        app.setDatasourceLabel(app.getConfigManager().getKey("application.title"));
        qx.core.Id.getQxObject("windows/datasources").open();
      }
    },
  
    /**
     * Returns the datasource data
     * @param {String }datasourceId
     * @return {Object|undefined}
     */
    getById(datasourceId) {
      return this.getModel().toArray().find(model => model.getValue() === datasourceId);
    }
  }
});
