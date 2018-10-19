Simple Locale Switcher
----------------------

A XUL-based extension for Mozilla [Firefox](https://www.mozilla.org/firefox/), [SeaMonkey](https://www.seamonkey-project.org/) and [Thunderbird](https://www.thunderbird.net/) that exposes the hidden preferences that define the preferred language for the user interface of the application.

The Simple Locale Switcher add-on works with [Firefox](https://addons.mozilla.org/firefox/addon/simple-locale-switcher/) 52.0 - 56.\*, [SeaMonkey](https://addons.thunderbird.net/seamonkey/addon/simple-locale-switcher/) 2.46 - 2.49.\*, [Thunderbird](https://addons.thunderbird.net/thunderbird/addon/simple-locale-switcher/) 52.0 - 56.\*.

### Install
The latest public release can be found in the [main page of the extension in addons.mozilla.org (AMO)](https://addons.mozilla.org/addon/simple-locale-switcher). Older releases, along with the changelogs and compatibility info, are listed in the [versions page in AMO](https://addons.mozilla.org/addon/simple-locale-switcher/versions/).

#### Firefox 57 and later

Being a so-called “legacy” add-on, it can’t be installed in Firefox 57 (a.k.a Firefox Quantum) and later versions, where only add-ons built using the WebExtensions model are accepted. Sadly, [it’s not possible to port this add-on to WebExtensions](https://github.com/nohamelin/simple-locale-switcher/issues/16).

The only remaining option for Firefox users is to manage the language manually, setting the [related internal preferences](https://support.mozilla.org/en-US/kb/use-firefox-interface-other-languages-language-pack#w_how-to-change-the-language-of-the-user-interface) of the application each time.


#### Thunderbird 60 and later

[Support for Thunderbird 60 and later](https://github.com/nohamelin/simple-locale-switcher/issues/18) is in progress. A date when a compatible build is ready is unknown; sorry about that.

Until a compatible build is ready, the recommended procedure is to download and reinstall the entire application for [Thunderbird](https://www.thunderbird.net/thunderbird/all/) already translated into your language.


### Docs

* [A (still rudely incomplete) general user guide](https://github.com/nohamelin/simple-locale-switcher/wiki/Simple-User-Guide)
* [A description of some advanced, hidden preferences](https://github.com/nohamelin/simple-locale-switcher/wiki/Advanced-Hidden-Preferences)
* [All the language names for the respective locale codes used to identify language packs](https://github.com/nohamelin/simple-locale-switcher/wiki/Language-Names-for-Locale-Codes)

Other external, related resources:

* [Language packs | Firefox support](https://support.mozilla.org/kb/install-language-packs-get-more-languages)
* [Language packs | MozillaZine knowledge base](http://kb.mozillazine.org/Language_packs)


### Contact, contribute

* Questions, bug reports and feature requests are tracked in the [Issues](https://github.com/nohamelin/simple-locale-switcher/issues) page. You will need to have a GitHub account to post here. Alternatively, there is a [thread in the MozillaZine forums](http://forums.mozillazine.org/viewtopic.php?f=48&t=2746943) open to general discussion.
* Translations are managed via the [BabelZilla platform](https://www.babelzilla.org/forum/index.php?showtopic=7551). They are done by a helpful group of volunteers. Please go there if you want to collaborate updating or starting a new localization.
* About code contributions via pull requests: before to start one, [**please create a new branch**](https://help.github.com/articles/creating-a-pull-request/) in your repository to accommodate your commits; it makes things easier if you need to do further amendments to your code.


### License

All the source code is shared under the terms of the [Mozilla Public License (MPL) 2.0](http://www.mozilla.org/MPL/2.0/).
