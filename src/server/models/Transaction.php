<?php

namespace app\models;

use lib\models\BaseModel;
use Yii;

/**
 * This is the model class for table "database1_data_Transaction".
 *
 * @property int $id
 * @property string $created
 * @property string $modified
 * @property string $datasource
 * @property string $class
 * @property int $transactionId
 */
class Transaction extends BaseModel
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return '{{%data_Transaction}}';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['transactionId'], 'integer'],
            [['datasource'], 'string', 'max' => 50],
            [['class'], 'string', 'max' => 100],
            [['datasource', 'class'], 'unique', 'targetAttribute' => ['datasource', 'class'], 'message' => 'The combination of Datasource and Class has already been taken.'],
        ];
    }

    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'created' => 'Created',
            'modified' => 'Modified',
            'datasource' => 'Datasource',
            'class' => 'Class',
            'transactionId' => 'Transaction ID',
        ];
    }
}
