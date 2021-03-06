<?php

namespace app\modules\extendedfields;


use app\models\Schema;
use lib\plugin\PluginInterface;
use Yii;
use lib\exceptions\RecordExistsException;


class Module
  extends \lib\Module
  implements PluginInterface
{

  const CATEGORY = "plugin.extendedfields";

  /**
   * The version of the module
   * @var string
   */
  protected $version = "0.0.8";

  /**
   * Installs the plugin.
   * @param boolean $enabled
   *    Whether the module should be enabled after installation (defaults to false)
   * @return boolean
   * @throws \Exception
   */
  public function install($enabled = false)
  {
    $schema_id = Datasource::SCHEMA_ID;
    // register schema
    try {
      Schema::register($schema_id, Datasource::class);
    } catch (RecordExistsException $e) {
      Yii::info("Schema '$schema_id' already registered.");
    }
    //$count = Yii::$app->datasourceManager->migrate(Schema::findByNamedId($schema_id));
    //Yii::info("Migrated $count datasources of schema '$schema_id'");
    // register module
    return parent::install(true);
  }
}
