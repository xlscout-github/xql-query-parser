# xql-parser (earley)

xql-parser is a query parsing module which breaks down the input query 
as per the grammer specified, utilizing a query parsing toolkit 
[nearley.js](https://nearley.js.org/). 
with nearley.js you have to specifiy your grammer (production rules) using the nearley syntax in a file with .ne extention once you are done with writting your grammer it needs to be compiled to a .js module utilizing nearleyc which is a nearley grammer compiler which comes with installing nearley.js it's syntax is as follows:
> nearleyc grammar.ne -o grammar.js

Once the js module is generated you can then use nearley to instantiate a Parser object. 
Once you have a Parser, you can .feed it a string to parse. 
The results returned is an array of possible parsings. 
Common usage is to use the first result.

# Installation instructions

Clone Repo.
> git clone repo directory

Go into project directory.
> cd directory

Install Dependencies.
> npm i

Generates js module from nearley grammer (auto invoked after install).
> npm run gen

# Essential scripts to keep in mind

Run all test cases identified by .test.js suffix written with Jest JavaScript Testing Framework.
> npm test

Generates js module from nearley grammer, must run after any alterations to the grammer.
> npm run gen
