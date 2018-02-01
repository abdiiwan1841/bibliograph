<?php
namespace app\migrations\data;
use yii\db\Schema;
use yii\db\Migration;

class m180105_075452_data_UserDataInsert extends Migration
{

    public function safeUp()
    {
        $this->batchInsert('{{%data_User}}',
                           ["namedId", "name", "password", "email", "anonymous", "ldap", "active", "lastAction", "confirmed", "online"],
                            [
    [
        
        'namedId' => 'admin',
        'name' => 'Administrator',
        'password' => '273a41fc35358d3f4612b4b67c62fc9111e0d175b9d61d72a',
        'email' => null,
        'anonymous' => '0',
        'ldap' => '0',
        'active' => '1',
        'lastAction' => '2017-12-29 10:48:21',
        'confirmed' => '0',
        'online' => '0',
    ],
    [
        
        'namedId' => 'manager',
        'name' => 'Manager',
        'password' => '200d91c0982ef9a080af57a6760b296d186cc2715437422d1',
        'email' => null,
        'anonymous' => '0',
        'ldap' => '0',
        'active' => '1',
        'lastAction' => null,
        'confirmed' => '0',
        'online' => '0',
    ],
    [
        
        'namedId' => 'user',
        'name' => 'User',
        'password' => '9f64bfb103e7765db6ed68827c4b8234be18a10f04885ff83',
        'email' => null,
        'anonymous' => '0',
        'ldap' => '0',
        'active' => '1',
        'lastAction' => null,
        'confirmed' => '0',
        'online' => '0',
    ]
    ]
        );
    }

    public function safeDown()
    {
        $this->truncateTable('{{%data_User}}');
    }
}
