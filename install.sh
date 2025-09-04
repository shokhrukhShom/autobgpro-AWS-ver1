#!/bin/bash
set -e
sudo yum update -y
sudo yum install -y python3-pip git nginx
pip3 install -r requirements.txt 