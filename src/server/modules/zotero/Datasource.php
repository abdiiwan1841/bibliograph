<?php
/**
 * Created by PhpStorm.
 * User: cboulanger
 * Date: 03.04.18
 * Time: 23:28
 */

namespace app\modules\zotero;

use app\models\BibliographicDatasource;
use app\modules\zotero\models\Collection;
use app\modules\zotero\models\Item;

/**
 * Class Datasource
 * @package app\modules\zotero
 */
class Datasource extends BibliographicDatasource
{
  /**
   * The named id of the datasource schema
   */
  const SCHEMA_ID = "zotero";

  /**
   * @inheritdoc
   * @var string
   */
  static $name = "Zotero library";

  /**
   * @inheritdoc
   * @var string
   */
  static $description = "A proxy for a library hosted at zotero.org ";

  /**
   * Initialize the datasource, registers the models
   * @throws \InvalidArgumentException
   */
  public function init()
  {
    parent::init();
    $this->addModel( 'folder',   Collection::class,   'folder');
    $this->addModel( 'reference',   Item::class,   'reference');
  }
}
