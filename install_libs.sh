# to install yarn
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update
sudo apt install yarn

# to install rust
sudo apt install cargo

#--------- for testing
# install mahimahi
sudo apt install mahimahi

# install pip
sudo apt install python-pip

# install google-chrome binary
#https://askubuntu.com/questions/510056/how-to-install-google-chrome

sudo apt-get install postgresql postgresql-contrib
sudo pip install selenium
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update 
sudo apt-get install google-chrome-stable


sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys E298A3A825C0D65DFD57CBB651716619E084DAB9
sudo add-apt-repository 'deb https://cloud.r-project.org/bin/linux/ubuntu bionic-cran35/'
sudo apt update
sudo apt install r-base
sudo pip install click
sudo pip install pyyaml
sudo pip install pandas
sudo pip install sqlalchemy
sudp apt install npm
npm install comlink
