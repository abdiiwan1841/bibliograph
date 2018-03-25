/*******************************************************************************
 *
 * Bibliograph: Online Collaborative Reference Management
 *
 * Copyright: 2007-2015 Christian Boulanger
 *
 * License: LGPL: http://www.gnu.org/licenses/lgpl.html EPL:
 * http://www.eclipse.org/org/documents/epl-v10.php See the LICENSE file in the
 * project's top-level directory for details.
 *
 * Authors: Christian Boulanger (cboulanger)
 *
 ******************************************************************************/

/*global qx qcl bibliograph*/

/**
 * The UI to import references from external databases
 */
qx.Class.define("bibliograph.ui.window.ImportWindowUi",
{
  extend : bibliograph.ui.window.ImportWindow,
  construct : function()
  {
    this.base(arguments);

    //connecting autogenerated id with 'this'
    let importWindow = this;

    importWindow.setCaption(this.tr('Import from file'));
    importWindow.setShowMinimize(false);
    importWindow.setWidth(700);
    importWindow.setHeight(500);
    qx.event.message.Bus.getInstance().subscribe("logout", function(e) {
      importWindow.close()
    }, this);
    importWindow.addListener("appear", function(e) {
      importWindow.center();
    }, this);
    let vbox1 = new qx.ui.layout.VBox(5, null, null);
    vbox1.setSpacing(5);
    importWindow.setLayout(vbox1);
    
    // Toolbar
    let toolBar = new qx.ui.toolbar.ToolBar();
    this.toolBar = toolBar;
    toolBar.setSpacing(10);
    importWindow.add(toolBar);

    // import filter
    let importFilterStore = new qcl.data.store.JsonRpcStore("import");
    qx.event.message.Bus.subscribe("bibliograph.setup.completed",()=>{
      importFilterStore.setAutoLoadParams([true]);
      importFilterStore.setAutoLoadMethod("importformats");  
    }),
    toolBar.add(this.createUploadWidget(), { flex : 1 });
    let importFilterSelectBox = new qx.ui.form.SelectBox();
    importFilterSelectBox.setWidth(200);
    importFilterSelectBox.setMaxHeight(25);
    toolBar.add(importFilterSelectBox);
    let qclController1 = new qx.data.controller.List(null, importFilterSelectBox, "label");
    importFilterStore.bind("model", qclController1, "model");
    importFilterSelectBox.bind("selection", this, "filter", {
      converter : this._convertImportFilterSelection
    });
    // upload button
    let uploadButton = new qx.ui.form.Button(this.tr('3. Upload file'), null, null);
    this.uploadButton = uploadButton;
    uploadButton.setEnabled(false);
    uploadButton.setLabel(this.tr('3. Upload file'));
    toolBar.add(uploadButton);
    uploadButton.addListener("execute", this._on_uploadButton_execute, this);
    let stack1 = new qx.ui.container.Stack();
    importWindow.add(stack1, {
      flex : 1
    });
    
    // Listview
    let tableview = new qcl.ui.table.TableView();
    this.listView = tableview;
    tableview.setServiceName("bibliograph.import");
    tableview.setDatasource("bibliograph_import");
    tableview.setDecorator("main");
    tableview.setModelType("reference");
    tableview.headerBar.setVisibility("excluded");
    tableview.menuBar.setVisibility("excluded");
    stack1.add(tableview);
    
    // Footer
    let hbox1 = new qx.ui.layout.HBox(5, null, null);
    let composite1 = new qx.ui.container.Composite();
    composite1.setLayout(hbox1)
    importWindow.add(composite1);
    hbox1.setSpacing(5);
    
    // Status label
    let statusTextLabel = new qx.ui.basic.Label(null);
    this.listView._statusLabel = statusTextLabel; // todo this is a hack
    composite1.add(statusTextLabel);
    this.listView.bind("store.model.statusText", statusTextLabel, "value");
    
    let spacer1 = new qx.ui.core.Spacer(null, null);
    composite1.add(spacer1, { flex : 10 });
    
    // Select all button
    let selectAllButton = new qx.ui.form.Button();
    this.selectAllButton = selectAllButton;
    selectAllButton.setLabel(this.tr('Import all records'));
    composite1.add(selectAllButton);
    selectAllButton.addListener("execute", function(e) {
      this.importReferences(true);
    }, this);
    
    // Import selected button
    let importButton = new qx.ui.form.Button();
    this.importButton = importButton;
    importButton.setEnabled(false);
    importButton.setLabel(this.tr('Import selected records'));
    composite1.add(importButton);
    importButton.bind("enabled", selectAllButton, "enabled");
    importButton.addListener("execute", function(e) {
      this.importReferences(false);
    }, this);
    
    // Close button
    let button1 = new qx.ui.form.Button();
    button1.setLabel(this.tr('Close'));
    composite1.add(button1);
    button1.addListener("execute", function(e) {
      this.close()
    }, this);
  }
});