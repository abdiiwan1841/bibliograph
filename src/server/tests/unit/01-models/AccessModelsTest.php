<?php

namespace app\tests\unit\models;

// for whatever reason, this is not loaded early enough
require_once __DIR__ . "/../../_bootstrap.php";

use app\tests\unit\Base;
use app\models\User;
use app\models\Group;
use app\models\Permission;
use app\models\Role;
use app\models\Config;
use app\models\UserConfig;

class AccessModelsTest extends Base
{
  /**
   * @var \UnitTester
   */
  protected $tester;

  public function _fixtures(){
    return require __DIR__ . '/../../fixtures/_access_models.php';
  }

  // tests
  public function testFindUser()
  {
    $I = $this->tester;
    $I->wantToTest("User data");
    $user = User::findOne(['namedId'=>"sarah_manning"]);
    $this->assertEquals('Sarah Manning', $user->name );
  }

  public function testUserGroupNames()
  {
    $user = User::findOne(['name'=>"Dale Cooper"]);
    $this->assertEquals('dale_cooper@bibliograph.org', $user->email );
    $groupNames = $user->getGroupNames();
    $this->assertEquals(['group2','group3'], $groupNames );
  }

  public function testUserGlobalRoles()
  {
    $user = User::findOne(['name'=>"Frank Underwood"]);
    $groupNames = $user->getRoleNames();
    $this->assertEquals(['manager'], $groupNames );
    $this->assertTrue( $user->hasPermission("config.value.edit") );
    $this->assertFalse( $user->hasPermission("does.not.exist") );
  }

  public function testRolePermissions()
  {
    $role = Role::findOne(['namedId'=>"user"]);
    $permissionNames = $role->getPermissionNames();
    $this->assertEquals(14, count($permissionNames) );
    $this->assertTrue( $role->hasPermission("config.value.edit") );
    $this->assertFalse( $role->hasPermission("does.not.exist") );
  }     

  public function testUserGlobalPermissions()
  {
    $user = User::findOne(['namedId'=>"admin"]);
    $permissionNames = $user->getPermissionNames();
    $this->assertEquals(34, count($permissionNames) );
    //$this->assertEquals([], $permissionNames );
    $this->assertTrue( $user->hasPermission("access.manage") );
    $this->assertTrue( $user->hasPermission("does.not.exist") ); // admin can do anything
  }  

  public function testGroupRoles()
  {
    $user = User::findOne(['name'=>"Dale Cooper"]);
    $group = Group::findOne(['namedId'=>'group2']);
    $groupNames = $user->getRoleNames($group->id);
    $this->assertEquals(['manager'], $groupNames );
  }

  public function testGroupUsers()
  {
    $group = Group::findOne(['namedId'=>'group1']);
    $userNames = $group->getUserNames();
    $this->assertEquals( 0, count( array_diff( $userNames, ['jessica_jones','frank_underwood','sarah_manning'] )));
  }

  public function testGroupDatasources()
  {
    $group = Group::findOne(['namedId'=>'group1']);
    $result = $group->getDatasourceNames();
    $this->assertEquals( ["database2"], $result );
  }    

  public function testUserDatasources()
  {
    $user = User::findOne(['name'=>"Sarah Manning"]);
    $result = $user->getDatasourceNames();
    $this->assertEquals( 0, count( array_diff( $result, ['database2','setup','database3'] )));
  } 
}
