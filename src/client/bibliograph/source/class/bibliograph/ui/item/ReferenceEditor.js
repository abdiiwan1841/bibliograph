/* ************************************************************************

  Bibliograph: Online Collaborative Reference Management

   Copyright:
     2007-2015 Christian Boulanger

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christian Boulanger (cboulanger)

************************************************************************ */

/**
 * The editor for individual entries
 */
qx.Class.define("bibliograph.ui.item.ReferenceEditor",
{
  extend : qx.ui.container.Composite,
  include : [bibliograph.ui.item.MCreateForm ],

  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */
  properties :
  {
    /**
     * The datasource of the items displayed
     */
    datasource :
    {
      check : "String",
      nullable : true,
      event : "changeDatasource",
      apply : "_applyDatasource"
    },

    /**
     * The type of the model of the item
     */
    modelType :
    {
      check : "String",
      nullable : true,
      event : "changeModelType"
    },

    /**
     * The id of the currently displayed item.
     * @todo rename to modelId
     */
    referenceId :
    {
      check : "Integer",
      nullable : true,
      event : "changeReferenceId",
      apply : "_applyReferenceId"
    },

    /**
     * The reference type of the record displayed
     */
    referenceType :
    {
      check : "String",
      nullable : true,
      event : "changeReferenceType",
      apply : "_applyReferenceType"
    },

    /**
     * The store providing data
     */
    store :
    {
      check : "qcl.data.store.JsonRpcStore",
      event : "changeStore",
      nullable : true
    },

    /**
     * The model data as sent from the server
     */
    data :
    {
      check : "Object",
      nullable : true
    },

    /**
     * The data model of the form data
     */
    model :
    {
      check : "qx.core.Object",
      nullable : true,
      event : "changeModel"
    },

    /**
     * The page of the stack view
     */
    page:
    {
      check : "String",
      nullable : true,
      apply : "_applyPage"
    },
  
    /**
     * Whether to log additional debug output
     */
    debug:{
      check: "Boolean",
      init: false
    }
  },

  /*
  *****************************************************************************
      CONSTRUCTOR
  *****************************************************************************
  */
  construct : function() {
    this.base(arguments);
    // additional debug messages
    this.setDebug(Boolean(qx.core.Environment.get("qx.debug")));
    // initialize privates
    this._forms = {};
    this.__pages = {};
    this.__buttons = {};
    // create store and bind the application datasource model's
    // tableModelService to the serviceName property
    var store = new qcl.data.store.JsonRpcStore("reference");
    this.setStore(store);
    // listen for server messages to update single form fields
    qx.event.message.Bus.getInstance().subscribe("bibliograph.fieldeditor.update", function(e) {
      var data = e.getData();
      var messageIsForMe =
          data.datasource === this.getDatasource() &&
          data.modelType === this.getModelType() &&
          data.modelId === this.getReferenceId();
      if (messageIsForMe) {
        var filter = [];
        for (let [key, value] of Object.entries(data.data)) {
          filter.push(key);
          qx.event.message.Bus.dispatch(new qx.event.message.Message("reference.changeData", {
            "referenceId" : data.modelId,
            "name" : key,
            "value" : value,
            "old" : this.getData()[key]
          }));
          this.getData()[key] = value;
        }
        this._syncFormWithModel(this.getReferenceType(), filter);
      }
    }, this);
  },
  members :
  {
    formStack : null,
    stackView : null,
    annotationPage : null,
    editor : null,
    _forms : null,
    _lastRequest : null,
    __preventDefault : false,
    __deferReattachBubbleEvent : 0,
    __pages : null,
    __buttons : null,

    /**
     * Returns the form data for the given reference type
     * @param reftype {String}
     * @return {Object} a map with objects that belong to the form
     */
    getFormData : function(reftype) {
      var id = this.getDatasource() + "-" + this.getModelType() + "-" + reftype;
      return this._forms[id];
    },

    /**
     * Caches the form data for the given reference type
     * @param reftype {String}
     * @param formData {Object} a map with objects that belong to the form
     * @return {void}
     */
    setFormData : function(reftype, formData) {
      var id = this.getDatasource() + "-" + this.getModelType() + "-" + reftype;
      this._forms[id] = formData;
    },

    _applyDatasource : function(value, old) {
      if (old) {
        this.formStack.setSelection([]);
      }
    },

    /**
     * Initiates the display of the form with data
     * @param referenceId {Number} The current reference id
     * @param old {Number} The previous reference id
     */
    _applyReferenceId : function(referenceId, old) {
      if (!referenceId || !this.isVisible()) {
       return;
      }

      /*
       * wait 200 ms before dispatching a request, so that
       * we're not sending to many
       */
      qx.util.TimerManager.getInstance().start(() => {
        if (referenceId === this.getReferenceId()) {
          this._load(referenceId);
        }
      }, null, this, null, 500);
    },

    /**
     * Applying the reference type shows the necessary form
     * @param reftype {String} The current reference type
     * @param old {String} The previous reference type
     */
    _applyReferenceType : function(reftype, old) {
      // hide old form
      if (old) {
        this.formStack.setSelection([]);
      }

      // get form data
      var formData = this.getFormData(reftype);
      if (!formData) {
        this.error("No form data exists for reference type " + reftype);
        return;
      }

      // show appropriate form in the stack
      this.formStack.setSelection([formData.view]);
      this.setEnabled(true);
      this.setVisibility("visible");
    },

    /**
     * Shows the stack view page with the given name
     *
     * @private
     * @param value
     * @param old
     */
    _applyPage : function(value, old) {
      this._showStackViewPage(value);
    },

    /*
    ---------------------------------------------------------------------------
       MAIN FORM
    ---------------------------------------------------------------------------
    */

    /**
     * Load the reference data and create form if it doesn't exist
     * @param referenceId {Integer}
     */
    _load : function(referenceId) {
      // debug
      if (this.__isLoading) {
        return;
      }

      //debug
      if (!referenceId) {
        this.warn("reference editor: no reference id.");
      }

      // we still have to wait for the service name to be set
      if (this.getStore().getServiceName() === "") {
        this.getStore().addListenerOnce("changeServiceName", function() {
          this._load(referenceId);
        }, this);
        return;
      }

      // disable the current form
      if (this.getReferenceType()) {
        this.setEnabled(false);
      }

      // load data
      this.showMessage(this.tr("Loading item data..."));
      this.__isLoading = true;
      var datasource = this.getDatasource();
      this.getStore().load("item", [datasource, referenceId], function(data) {
        this.__isLoading = false;
        this.showMessage(null);
        this.setData(data);
        this._populateForm();
      }, this);
    },

    // Populate the form, creating it if it doesn't exist yet.
    _populateForm : function() {
      var data = this.getData();

      // reference type determines form type
      var reftype = data.reftype;
      if (!reftype) {
        this.error("Invalid data: no reference type");
      }
      
      if (this.getFormData(reftype)) {
        // if we have the form data already, we can display the form right away
        this._syncFormWithModel(reftype);
        this.setReferenceType(reftype);
        this.setEnabled(true);
      } else {
         // else, we need to get the form data first
         // to do cache the form data in a persistent storage
        this.showMessage(this.tr("Loading form data..."));
        this.menuBar.setEnabled(false);

        // load form data first
        this.getStore().execute("form-layout", [this.getDatasource(), reftype], formData => {
          this.showMessage(null);
          this._createForm(reftype, formData);
        });
      }
    },

    /**
     * Creates the form from json data
     * @param reftype {String} The type for which the form is created
     * @param data {Object} The form data
     */
    _createForm : function(reftype, data) {
      this.showMessage(this.tr("Creating form, please wait ..."));

      // form object
      var formObj = this.createForm(data);

      // form view
      var formView = new bibliograph.ui.item.FormRenderer(formObj);

      // form controller
      var controller = new qx.data.controller.Form();
      controller.setTarget(formObj);

      // save in cache
      this.setFormData(reftype, {
        "form" : formObj,
        "view" : formView,
        "controller" : controller
      });

      // add to view
      this.formStack.add(formView);
      this.formStack.addOwnedQxObject(formObj, reftype);

      // update form
      this._syncFormWithModel(reftype);

      // show form
      this.setReferenceType(reftype);

      // we're done
      this.showMessage(null);
      this.menuBar.setEnabled(true);
    },

    /**
     * Apply the loaded model to the form controller
     * @param reftype {String} The reference type
     * @param filter {Array|undefined}
     *    Optional array of field names to restrict the update to
     * @todo this needs to be rewritten from scratch, maybe preventing changes while form is disabled
     */
    _syncFormWithModel : function(reftype, filter) {
      var formData = this.getFormData(reftype);
      var form = formData.form;
      var controller = formData.controller;
      var data = this.getData();
      var debugMode = this.isDebug();

      // setup form model if not yet created
      if (!controller.getModel()) {
        formModel = controller.createModel(true);
        controller.setModel(formModel);
      } else {
        // otherwise, remove change listener while form is populated
        var formModel = controller.getModel();
        formModel.removeListener("changeBubble", this._on_changeBubble, this);
      }

      // copy the data model properties to the form model
      var timer = qx.util.TimerManager.getInstance();
      for (var [property, value] of Object.entries(data)) {
        var formElement = form.getItems()[property];
  
        // skip if no matching form element
        if (!formElement) {
          if (debugMode) {
            this.warn(`No matching form element for "${property}"`);
          }
          continue;
        }
        if (debugMode) {
          this.debug("Setting field " + property + " to '"+ value + "' in " + formElement);
        }

        // skip if filter is given and property is not in filter
        if (qx.lang.Type.isArray(filter) && filter.indexOf(property) < 0) {
          continue;
        }

        // is it a single selection widget?
        if (qx.Class.implementsInterface(formElement, qx.ui.core.ISingleSelection)) {
          var children = formElement.getChildren();

          // the child elements have already been loaded
          if (children.length) {
            if (debugMode) {
             console.log("Data of " + formElement + "already loaded.");
            }
            children.forEach(function(child) {
              if (child.getModel().getValue() === value) {
                this.__preventDefault = true;
                formElement.setSelection([child]);
                this.__preventDefault = false;
              }
            }, this);
          } else {
            // no, we have to wait for them to load
            if (debugMode) {
             console.log("Data of " + formElement + "not yet loaded, deferring selection.");
            }
            this.__deferReattachBubbleEvent++;
            var selectionHandler = function(property, value) {
              var formElement = form.getItems()[property];
              // select with a small timeout
              timer.start(() => {
                var children = formElement.getChildren();
                if (debugMode) {
                 console.log("Trying again to apply selection '" + value + "' in " + formElement + ", having now " + children.length + " child widgets.");
                }
                var found = false;
                children.forEach(function(child) {
                  if (found) {
                    return;
                  }
                  if (debugMode) {
                   console.log("  " + child.getModel().getValue());
                  }
                  if (child.getModel().getValue() === value) {
                    this.__preventDefault = true;
                    if (debugMode) {
                     console.log("Applying deferred selection of child widget in " + formElement);
                    }
                    formElement.setSelection([child]);
                    found = true;
                    this.__preventDefault = false;
                  }
                }, this);
                this.__deferReattachBubbleEvent--;
                if (!this.__deferReattachBubbleEvent) {
                  formModel.addListener("changeBubble", this._on_changeBubble, this);
                  this.setEnabled(true);
                }
              }, null, this, null, 50);
            };

            // call selection handler when model has changed
            formElement
              .getUserData("controller")
              .addListenerOnce("changeModel", qx.lang.Function.bind(selectionHandler, this, property, value));
          }
        } else if (formElement instanceof qx.ui.form.DateField) {
          // Are we dealing with a date field?
          if (value !== null) {
            if (!value.match(/[0-9]{4}\-[0-9]{2}\-[0-9]{2}/)) {
              this.warn("Invalid date value, must be YYYY-MM-DD: " + value);
              value = null;
            } else {
              var d = value.split("-");
              value = new Date(d[0], d[1], d[2]);
            }
          }
          controller.getModel().set(property, value);
        } else {
          // no, simple copy value
          controller.getModel().set(property, value);
        }
      }

      // (re-) attach listener
      if (!this.__deferReattachBubbleEvent) {
        formModel.addListener("changeBubble", this._on_changeBubble, this);
      }
      // remove lock
      bibliograph.ui.item.ReferenceEditor.__preventSave = false;
    },

    /*
    ---------------------------------------------------------------------------
       EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Called when the view becomes visible
     */
    _on_appear : function() {
      var refId = this.getReferenceId();
      var ds = this.getDatasource();
      if (refId && ds) {
        this.reload();
      }
    },

    /**
     * Called when form field changed
     *
     * @param event
     */
    _on_changeBubble : function(event) {
      var eventData = event.getData();
      var value = eventData.value;
      var old = eventData.old;
      var name = eventData.name;
      var data = {};

      // get value from selection models
      if (value instanceof qx.core.Object) {
        value = value.getValue();
      }

      // dispatch message
      let msgData ={
        "referenceId" : this.getData().referenceId,
        "name" : name,
        "value" : value,
        "old" : old
      };
      qx.event.message.Bus.dispatchByName("reference.changeData", msgData);

      // if no change, do nothing
      if (this.getData()[name] === value) {
        this.isDebug() && this.debug(`Field '${name}' hasn't changed."`);
        return;
      }
      
      // wait some time before dispatching a request, so that we're not sending to many
      var timeoutId = qx.lang.Function.delay(() => {
        // check if the id has changed in the meantime
        if (timeoutId !== this.__timeoutId) {
          this.isDebug() && this.debug("Not saving field '"+ name + "' - other save operation in progress...");
          return;
        }

        // don't save if value has changed in the meantime
        var target = this.getFormData(this.getReferenceType()).form.elements[name];
        if (qx.Class.implementsInterface(target, qx.ui.form.IField)) {
          let currentValue = target.getValue();
          if (!qx.lang.Type.isObject(currentValue) && value !== currentValue) {
            this.isDebug() && this.debug(`Not saving field '${name}' because value has changed from '${value}' to '${currentValue} in the meantime.'`);
            return;
          }
        }
  
        // if value is a Date object, serialize it
        if (value instanceof Date) {
          value = value.getFullYear() + "-" + value.getMonth() + "-" + value.getDate();
        }

        // create map
        data[name] = value;

        // disable form if reftype changed
        if (name === "reftype" && !this.__preventDefault) {
          this.setEnabled(false);
        }

        // save to server
        this.showMessage(this.tr("Saving..."));
        this.getStore().execute("save", [this.getData().datasource, this.getData().referenceId, data], function() {
          this.showMessage(null);

          // update data
          this.getData()[name] = value;

          // reload data if reftype changed
          if (name === "reftype" && !this.__preventDefault) {
            this.reload();
          }
        }, this);
      }, 500, this);
      this.__timeoutId = timeoutId;
    },


    /*
    ---------------------------------------------------------------------------
       INTERNAL METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Adds a stack view page by name
     * @param name {String}
     * @param page {qx.ui.layout.VBox}
     * @param button {qx.ui.menubar.Button}
     * @private
     */
    _addStackViewPage : function(name, page, button) {
      this.__pages[name] = page;
      this.__buttons[name] = button;
    },

    /**
     * Returns the stack view page by name
     * @param name {String}
     * @returns {qx.ui.layout.VBox}
     * @private
     */
    _getStackViewPage : function(name) {
      return this.__pages[name];
    },

    /**
     * Returns the menu button corresponding to a stack view page by name
     * @param name {String}
     * @returns {qx.ui.menubar.Button}
     * @private
     */
    _getStackViewPageButton : function(name) {
      return this.__buttons[name];
    },

    /**
     * Shows the given stack view page by name and highlights the corresponding button
     * @param name {String}
     * @private
     */
    _showStackViewPage : function(name) {
      var page = this._getStackViewPage(name);
      var button = this._getStackViewPageButton(name);
      if (page && button) {
        this.stackView.setSelection([page]);
        if (this.__button) {
          this.__button.setLabel(this.__button.getUserData("label"));
        }
        button.setUserData("label", button.getLabel());
        button.setLabel("<u>" + button.getLabel() + "<u>");
        this.__button = button;

        // todo: bad hardwiring
        qx.core.Init.getApplication().setItemView("referenceEditor-"+name);
      } else {
        this.warn("Stack view page '"+name+"' does not exist.");
      }
    },

    /**
     * Sets up the TextArea widgets outside the server-generated form
     * @param textarea {qx.ui.form.TextArea}
     * @param fieldname {String}
     * @private
     */
    _setupTextArea : function(textarea, fieldname) {
      var _this = this;
      // bind the editor's model's store to the textarea's value
      this.bind("store.model." + fieldname, textarea, "value", {
        converter : function(value) {
          // prevent the saving of the new data
          textarea.__value = value;
          textarea.__referenceId = _this.getReferenceId();
          return value;
        }
      });

      // setup a listener
      textarea.addListener("changeValue", function changeValueListener(e) {
        //console.log( "Value of " + fieldname + " has changed to '" + e.getData() + "'");

        // check if value has just been set
        var textarea = e.getTarget();
        var value = e.getData();

        if (textarea.__value === value) {
          //console.warn("Not saving server values...");
          textarea.__value = null;
          return;
        }
        if (textarea.__referenceId !== this.getReferenceId()) {
          //console.warn("Different reference id. Not saving...");
          return;
        }

        if (value === null) {
          return;
        }

        var datasource = this.getDatasource();
        var referenceId = this.getReferenceId();

        // wait some time before sending a request
        var timeoutId = qx.lang.Function.delay(function() {
          // check if the id has changed in the meantime
          if (timeoutId !== this.__timeoutId) {
            //console.warn("Not saving field '"+ fieldname + "' - other save operation in progress...");
            return;
          }

          // save new value
          this.showMessage(this.tr("Saving..."));
          var data = {};
          data[fieldname] = value;
          rpc.Reference.save(datasource, referenceId, data)
          .then(() => {
              this.showMessage(null);
              this.getData()[name] = value;
          });
        }, 500, this);

        this.__timeoutId = timeoutId;
      }, this);
    },

    /**
     * Sets up autocomplete for a standalone TextField widget
     * @param widget {qx.ui.form.TextField}
     * @param fieldname {String}
     * @param separator {String}
     * @private
     */
    _setupAutocomplete : function(widget, fieldname, separator) {
      var _this = this;
      var controller = new qcl.data.controller.AutoComplete(null, widget, separator);
      var store = new qcl.data.store.JsonRpcStore("reference");
      store.setAutoLoadMethod("autocomplete");
      controller.bind("input", store, "autoLoadParams", {
        "converter" : function(input) {
          return input ? [_this.getDatasource(), fieldname, input] : null;
        }
      });
      store.bind("model", controller, "model");
    },

    /*
    ---------------------------------------------------------------------------
       API METHODS
    ---------------------------------------------------------------------------
    */

    /**
 * Loads a reference
 *
 * @param referenceId
 */
    load : function(referenceId) {
      //qx.event.message.Bus.dispatch(qx.event.message.Message(""))
      this.setReferenceId(referenceId);
    },

    /**
     * Reloads the current id
     */
    reload : function() {
      this._load(this.getReferenceId());
    },

    /**
     * Shows a status message
     * @param msg {String}
     */
    showMessage : function(msg) {
      this._statusLabel.setValue(msg);
    }
  }
});
