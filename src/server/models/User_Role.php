<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "join_User_Role".
 *
 * @property integer $id
 * @property string $created
 * @property string $modified
 * @property integer $UserId
 * @property integer $RoleId
 * @property integer $GroupId
 */
class User_Role extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'join_User_Role';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['created', 'modified'], 'safe'],
            [['UserId', 'RoleId', 'GroupId'], 'integer'],
            [['GroupId', 'RoleId', 'UserId'], 'unique', 'targetAttribute' => ['GroupId', 'RoleId', 'UserId'], 'message' => 'The combination of User ID, Role ID and Group ID has already been taken.'],
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
            'UserId' => 'User ID',
            'RoleId' => 'Role ID',
            'GroupId' => 'Group ID',
        ];
    }
}
