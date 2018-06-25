#!/usr/bin/env bash

default_namespace="app\migrations\schema"
cd src/server
read -p 'Please enter a short descriptive name of the migration: ' name
read -p "Please enter the namespace of the migration [$default_namespace]:" -r -e namespace
namespace=${namespace:-$default_namespace}
dir=$(echo $namespace | sed -e 's/\\/\//g' | sed -e 's/app\///g')
[ ! -d $dir ] && echo "Namespace '$namespace' ($(pwd)/$dir) does not exist" && exit 0
#namespace=$(echo $namespace | sed -e 's/\\/\\\\/g')
class_name=_$(echo $name | sed -e 's/[^a-zA-Z0-9\-]/_/g')
php yii migrate/create --migration-namespaces=$namespace $class_name