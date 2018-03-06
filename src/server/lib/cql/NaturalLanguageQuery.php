<?php
/* ************************************************************************

   Bibliograph: Collaborative Online Reference Management

   http://www.bibliograph.org

   Copyright:
     2004-2015 Christian Boulanger

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
   *  Christian Boulanger (cboulanger)

************************************************************************ */

namespace lib\cql;

use app\schema\AbstractReferenceSchema;
use \yii\db\ActiveQuery;
use \stdClass;
use \Yii;

use app\models\Datasource;
use lib\exceptions\UserErrorException;
use lib\util\Tokenizer;

/**
 * Tool for working with the CQL query language
 *
 * @see http://www.loc.gov/standards/sru/resources/cql-context-set-v1-2.html
 * @property array $modifiers
 * @property array $booleans
 * @property string $query
 */
class NaturalLanguageQuery extends \yii\base\BaseObject
{

  /**
   * @var string
   */
  public $query;

  /**
   * @var \app\schema\BibtexSchema
   */
  public $schema = null;

  /**
   * @var Diagnostic|SearchClause|Triple|null
   */
  public $cql;

  /**
   * The dictionary of operators and modifiers
   * @var array
   */
  protected $dictionary = [];

  const TYPE_COMPARATOR = "comparator";

  const TYPE_BOOLEAN = "boolean";
  /**
   * @var AbstractReferenceSchema|array
   */
  private $config;


  /**
   * NaturalLanguageQuery constructor.
   * @param array $config
   */
  public function __construct(array $config = [])
  {
    if( ! isset($config['query']) ){
      throw new \InvalidArgumentException("You need to set the 'query' property");
    }
    if( ! isset($config['schema']) or !( $config['schema'] instanceof AbstractReferenceSchema) ){
      throw new \InvalidArgumentException("Invalid 'schema' property");
    }
    parent::__construct($config);
    $this->cql = $this->parseMulitLanguageQuery($this->query);
  }

  /**
   * Modifiers. Make sure that longer expressions that contain other expressions ("isnot" - "is")
   * appear first, otherwise the shorter ones will be substituted first, making the longer ones
   * unparsable.
   * @var array
   */
  public function getOperators()
  {
    return array_keys( $this->getOperatorData() );
  }

  /**
   * Returns the metadata on available operators. If an operator is passed as parameter, only
   * the metadata (type, translation) for this operator is returned. Otherwise, return
   * the data on all operators
   * @param null $operator
   * @return array
   */
  public function getOperatorData($operator = null)
  {
    static $data = [];
    $locale = Yii::$app->language;
    if(! isset($data[$locale]) ) {
      $data[$locale] = [
        "and" => [
          'translation' => Yii::t('app', "{leftOperand} and {rightOperand}"),
          'type' => self::TYPE_BOOLEAN
        ],
        "or" => [
          'translation' => Yii::t('app', "{leftOperand} or {rightOperand}"),
          'type' => self::TYPE_BOOLEAN
        ],
        "!=" => [
          'translation' => Yii::t('app', "{field} is not {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
        "=" => [
          'translation' => Yii::t('app', "{field} is {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
        "contains" => [
          'translation' => Yii::t('app', "{field} contains {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
        "notcontains" => [
          'translation' => Yii::t('app', "{field} does not contain {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
        "startswith" => [
          'translation' => Yii::t('app', "{field} starts with {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
        ">" => [
          'translation' => Yii::t('app', "{field} is greater than {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
        ">=" => [
          'translation' => Yii::t('app', "{field} is greater than or equal to {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
        "<" => [
          'translation' => Yii::t('app', "{field} is smaller than {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
        "<=" => [
          'translation' => Yii::t('app', "{field} is smaller than or equal to {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
//      "between" => [
//        'translation' => Yii::t('app', "{field} is between {value}"),
//        'type' => self::TYPE_COMPARATOR
//      ],
        "sortby" => [
          'translation' => Yii::t('app', "sort by {value}"),
          'type' => self::TYPE_COMPARATOR
        ],
        "empty" => [
          'translation' => Yii::t('app', "{field} is empty"),
          'type' => self::TYPE_COMPARATOR
        ],
        "notempty" => [
          'translation' => Yii::t('app', "{field} is not empty"),
          'type' => self::TYPE_COMPARATOR
        ]
      ];
    }
    return $operator ? $data[$locale][$operator] : $data[$locale];
  }

  /**
   * Getter method for modifiers property
   * @return array
   */
  protected function getModifiers(){
    return array_keys( array_filter( $this->getOperatorData(),
      function($item){
        return $item['type'] === self::TYPE_COMPARATOR;
      }));
  }

  /**
   * Getter method for booleans property
   * @return array
   */
  protected function getBooleans(){
    return array_keys( array_filter( $this->getOperatorData(),
      function($item){
        return $item['type'] === self::TYPE_BOOLEAN;
      }));
  }

  /**
   * Returns the dictionary of words to be translated into english
   * booleans, modifiers or object properties
   * @param \app\schema\AbstractReferenceSchema $schema
   * @return array The dictionary for the model
   * @todo cache data
   */
  protected function getDictionary()
  {
    $schemaClass = get_class($this->schema);
    $locale = Yii::$app->language;
    $key = "$schemaClass/$locale";
    if ( !isset($this->dictionary[$key]) ) {
      $dict=[];
      // model indexes
      $indexNames = $this->schema->getIndexNames();
      foreach ( $indexNames as $index) {
        $fields = $this->schema->getIndexFields($index);
        foreach ($fields as $field ) {
          $translated = $this->schema->getFieldLabel($field);
          $translated = \mb_strtolower($translated, 'UTF-8');
          $dict[$translated] = $field;
          // add the root form of German gendered words ("Autor/in"=> "Autor")
          if ( substr($locale,0,2) === "de" and $pos = strpos($translated, "/")) {
            $dict[substr($translated, 0, $pos)] = $field;
          }
        }
      }
      // modifiers and booleans
      foreach ( $this->operators as $operator) {
        // save the lowercase version of the translation for fast lookup
        $translations = $this->getOperatorData($operator)['translation'];
        //Yii::info([Yii::$app->language, $operator, $translations ]);
        foreach ((array) $translations as $translation) {
          // remove placeholder tokens
          $replace_placeholders = ['{leftOperand}','{rightOperand}','{field}','{value}'];
          $translation = \mb_strtolower( trim(str_replace($replace_placeholders,'', $translation)), 'UTF-8');
          $dict[$translation] = $operator;
        }
      }
      $this->dictionary[$key] = $dict;
      //if( $locale!="en-US") Yii::info($dict);
    }
    return $this->dictionary[$key];
  }


  /**
   * Translate operators, booleans and indexes.
   * @param $query
   * @return Diagnostic|SearchClause|Triple|null
   */
  protected function parseMulitLanguageQuery($query)
  {
    $tokenizer = new Tokenizer($query);
    $tokens = $tokenizer->tokenize();
    $operators = $this->getOperators();
    $hasOperator = false;
    $parsedTokens = [];
    $dict = $this->getDictionary();
    do {
      $token = $tokens[0];
      //Yii::info("Looking at '$token'...");
      // do not translate quoted expressions
      if ( in_array( $token[0], ["'", '"']) ) {
        array_shift($tokens);
      } else {
        // compare multi-word token
        $offset = 1;
        for($i=0; $i<count($tokens); $i++){
          $compare = implode( " ", array_slice( $tokens, 0, $i+1 ));
          $compare = mb_strtolower( $compare, "UTF-8");
          //Yii::info("Comparing '$compare'...");
          if( isset( $dict[$compare] ) ) {
            $token = $dict[$compare];
            $offset = $i+1;
            //Yii::info("Found '$token'.");
          }
        }
        $tokens = array_slice($tokens, $offset);
        //Yii::info("Using '$token', rest: " . implode("_",$tokens));
      }
      if( in_array( $token, $operators ) ) $hasOperator = true;
      $parsedTokens[] = $token;
    } while (count($tokens));
    //Yii::info("Parsed tokens: " . implode("_", $parsedTokens));

    // Re-assemble translated query string
    if ($hasOperator) {
      $cqlQuery = implode(" ", $parsedTokens);
    } else {
      // Queries that don't contain any operators or booleans are put into quotes
      $cqlQuery = '"' . implode(" ", $parsedTokens) . '"';
    }

    // create and configure parser object
    $parser = new Parser($cqlQuery);
    $parser->setBooleans($this->booleans);
    $parser->setModifiers($this->modifiers);
    $parser->setSortWords(array("sortby"));

    // parse CQL string
    $cql = $parser->query();
    if ($cql instanceof Diagnostic) {
      throw new UserErrorException(Yii::t('app',"Could not parse query: " . $cql->toTxt()));
    }
    return $cql;
  }

  /**
   * Inject the CQL query into an ActiveQuery
   * @param ActiveQuery $activeQuery
   */
  public function injectIntoYiiQuery(ActiveQuery &$activeQuery ){
    $this->addCondition($this->cql, $activeQuery);
  }

  /**
   * Recursive function to transform the CQL object structure into
   * an ActiveQuery.
   * @param Diagnostic|SearchClause|Triple $cqlObject
   * @param ActiveQuery $activeQuery The ActiveQuery object, which will
   * be changed in-place
   */
  protected function addCondition(\lib\cql\Object $cqlObject, ActiveQuery &$activeQuery)
  {
    if ($cqlObject instanceof Triple) {
      // If triplle, drill deeper
      $this->addCondition($cqlObject->leftOperand, $activeQuery);
      $this->addCondition($cqlObject->rightOperand, $activeQuery);
      return;
    }

    if ($cqlObject instanceof SearchClause) {
      // look for index
      $index = $cqlObject->index->value;
      $relation = mb_strtolower($cqlObject->relation->value);
      $term = str_replace('"', "", $cqlObject->term->value);

      if ( $index == "serverChoice") {
        // use an index named 'fulltext', which must exist in the model.
        // @FIXME this is not portable! Get colum names dynamically
        $columns = ['abstract','annote','author','booktitle','subtitle','contents','editor','howpublished','journal','keywords','note','publisher','school','title','year'];
        $matchClause = "`" . implode("`,`", $columns) . "`";
        // @todo make this configurable
        $condition = "MATCH($matchClause) AGAINST ('$term' IN NATURAL LANGUAGE MODE WITH QUERY EXPANSION)";
        // @todo hack to remove
        $activeQuery->select = array_map(function($column){
          return $column=="references.id" ? "id" : $column;
        }, $activeQuery->select);
      } else {
        // else, translate index into property
        if (! in_array($index, $this->schema->fields())) {
          throw new UserErrorException(Yii::t('app', "Search field '{index}' does not exist.", [
            'index' => $index
          ]));
        }
        $column = $index;
        $condition=[];
        switch ($relation) {
          // simple field comparison. compare numeric values normally
          // and replace "*" with "%" for "LIKE" comparisons for strings
          case "=":
            if (is_numeric($term)) {
              $condition[$column] = $term;
            } else {
              if( strstr($term,"*")){
                $term = str_replace("*", "%", $term);
              }
              $condition = ['like', $column, $term, false];
            }
            break;

          case "!=":
            if (is_numeric($term)) {
              $condition = ['not',[$column => $term]];
            } else {
              if( strstr($term,"*")){
                $term = str_replace("*", "%", $term);
              }
              $condition = ['not',['like', $column, $term, false]];
            }
            break;

          case "contains":
            $condition = ['like', $column, $term];
            break;

          case "notcontains":
            $condition = ['not like', $column, $term];
            break;

          case "startswith":
            $term = "$term%";
            $condition = ['like', $column, $term, false];
            break;

          case ">":
          case "<":
          case ">=":
          case "<=":
            $condition = [$relation, $column, $term];
            break;

          case "empty":
            $condition = ['or',[[$column => null],[$column=>""]]];
            break;

          case "notempty":
            $condition = ['not',['or',[[$column => null],[$column=>""]]]];
            break;

          default:
            throw new UserErrorException("Relation '$relation' not implemented.");
        }
      }
      // @todo support OR condition!
      $activeQuery = $activeQuery->andWhere($condition);
    } elseif ($cqlObject instanceof Diagnostic) {
      // Syntax error
      throw new UserErrorException($cqlObject->toTxt());
    } else {
      throw new \InvalidArgumentException("Invalid CQL object " . get_class($cqlObject));
    }
  }
}