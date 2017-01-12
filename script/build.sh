#!/bin/bash
set -e
PROJECTNAME=e-identification-fake-vtj
PWD=$(pwd)

unamestr=$(uname)
SCRIPTFILE="undefined"

# check os, os x users install coreutils: brew install coreutils
if [ $unamestr == "Linux" ]; then
  SCRIPTFILE=$(readlink -f "$0")
elif [ $unamestr == "Darwin" ]; then
  SCRIPTFILE=$(greadlink -f "$0")
fi

SCRIPTPATH=$(dirname "$SCRIPTFILE")

cd ${SCRIPTPATH}/..
function usage
{
        echo "usage: $0 [OPTION] TARGET_ENV"
        echo
        echo "Builds a docker image"
        echo
        echo "  -p, --push                              Push to docker registry"
}

while [ "$1" != "" ]; do
    case $1 in
        "local" ) TARGET_ENV=local
                                ;;
        "dev" ) TARGET_ENV=dev
                                ;;
        "kete" ) TARGET_ENV=kete
                                ;;
        "test" ) TARGET_ENV=test
                                ;;
        "prod" ) TARGET_ENV=prod
                                ;;
        -t | --tag )          IMAGE_TAG="$2"
                                shift
                                ;;
        -p | --push )           push=1
                                ;;
        -h | --help )           usage
                                exit
                                ;;
        -d | --no-deps )        # compatibility
                                ;;
        * )                     usage
                                echo $1
                                exit 1
    esac
    shift
done

cd ${SCRIPTPATH}/..

# Pull the base image
docker pull dev-docker-registry.kapa.ware.fi/e-identification-base-node

IMAGE_NAME=dev-docker-registry.kapa.ware.fi/e-identification-fake-vtj:${TARGET_ENV}

#build, tag and push docker image

docker build -f Dockerfile -t ${IMAGE_NAME} .
if [ "$push" = "1" ]; then
        docker push ${IMAGE_NAME}
fi

if [ ! -z ${IMAGE_TAG+x} ]; then
        docker tag ${IMAGE_NAME} ${IMAGE_NAME}_${IMAGE_TAG}
        if [ "$push" = "1" ]; then
                docker push ${IMAGE_NAME}_${IMAGE_TAG}
                docker rmi ${IMAGE_NAME}_${IMAGE_TAG}
        fi
fi
if [ "$push" = "1" ]; then
        docker rmi ${IMAGE_NAME}
fi

cd ${PWD}
