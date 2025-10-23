  336  git clone git@github.com:UMAtaullin/journal.git
  337  python3 -m venv env
  338  source env/bin/activate
  340  pip install -r requirements.txt 
  341  django-admin startproject core .
  344  python manage.py migrate
  345  python manage.py runserver
  358  git config user.name 'Ural'
  359  git config user.email ataullinural@gmail.com