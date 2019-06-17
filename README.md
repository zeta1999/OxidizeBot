# ![alt text](https://raw.githubusercontent.com/udoprog/setmod/master/bot/res/icon48.png "SetMod Rust Bot") SetMod

[![Build Status](https://travis-ci.org/udoprog/setmod.svg?branch=master)](https://travis-ci.org/udoprog/setmod)
[![Build status](https://ci.appveyor.com/api/projects/status/cxagsq3idti252a4/branch/master?svg=true)](https://ci.appveyor.com/project/udoprog/setmod/branch/master)

This is a high performance Twitch Bot written in Rust.

## Features

**Commands** &mdash; Aliases, custom commands, promotions, plus a bunch more [built-in commands](#built-in-commands).

If there's something you're missing, feel free to [open an issue].

**Rust** &mdash; Written in [Rust], promoting high performance, low utilization, and reliability.

<img title="Rust" width="67" height="50" src="https://github.com/udoprog/setmod/raw/master/gfx/cuddlyferris.png" />

**Configurable** &mdash; Everything is tweakable to suit your needs through a [hundred settings].
Changes to settings applies immediately - no need to restart.

<img title="Settings" width="140" height="50" src="https://github.com/udoprog/setmod/raw/master/gfx/setting.png" />

**Integrated with Windows** &mdash; Runs in the background with a System Tray.
Notifies you on issues.
Starts automatically with Windows if you want it to.

<img title="Windows Systray" width="131" height="50" src="https://github.com/udoprog/setmod/raw/master/gfx/windows-systray.png" />

[open an issue]: https://github.com/udoprog/setmod/issues
[Rust]: https://rust-lang.org
[hundred settings]: /bot/src/settings.yaml

## Installing and Running

You can download an installer or an archive from [releases](https://github.com/udoprog/setmod/releases) or [build the project yourself](#building).

## Building

You'll need Rust and a working compiler: https://rustup.rs/

For now and until `async_await` is stable, you will need to use the _nightly_ rust compiler.
This can be installed and configured by running:

```
rustup toolchain install nightly
rustup default nightly
```

On **Windows**, you will need to setup some environment variables.
You can do that in PowerShell by running the following in the shell:

```
./tools/env.ps1
```

After this, you build the project using cargo:

```
cargo +nightly build --release
```

If you want to build and run the project in one go, there is a helper script in [`tools/setmod.ps1`] that you can run from anywhere in a powershell terminal, like this:

```
C:\setmod\> C:\Projects\setmod\tools\setmod.ps1
```

[`tools/setmod.ps1`]: tools/setmod.ps1

## Settings

SetMod is moving towards storing settings in the database.

These settings are stored as slash-separated strings, like `player/max-songs-per-user`.

You can find all available settings and their types in [`settings.yaml`](bot/src/settings.yaml).

When the bot is running, you can find all settings under `Internal -> Settings`.

## YouTube Player

setmod has support for playing YouTube videos.

This is enabled through the `song/youtube/support` setting and requires you to run the YouTube Player in the web UI.

This can be embedded in OBS with the following Custom CSS:

```css
body { background-color: rgba(0, 0, 0, 0); }
.overlay-hidden { display: none };
```

This will cause the player to disappear while it is not playing anything.

## Built-in Commands

## Commands

Every command is enabled through a Setting named `<command>/enabled`.

To for example enable the `!admin` command, you'd have to make sure the `admin/enabled` setting is set.

Authorizing the running of commands is done in the Authorization tab in the web UI.
Each command has their own scope that can be tweaked.

Some commands also has more granular permissions, like `game` and `game/edit` which distinguishes between read and write operations.

#### `!admin` command

* `!admin version` - Responds with the current version of the setmod-bot package.
* `!admin refresh-mods` - Refresh the set of moderators in the bot. This is required if someone is modded or unmodded while the bot is running.
* `!admin settings <key>` - Read the value of a setting.
* `!admin settings <key> <value>` - Write the value of a setting.
* `!admin push` - Push a value to a setting which is a collection.
* `!admin delete <key> <value>` - Delete a value from a settings which is a collection.
* `!admin shutdown` - Cause the mod to cleanly shut down and restart.
* `!admin enable-group <group>` - Enable all commands, aliases, and promotions part of the specified group.
* `!admin disable-group <group>` - Disable all commands, aliases, and promotions part of the specified group.

#### Misc Commands

Available commands:

* `!uptime` - Get the current uptime. Enabled with `uptime/enabled`.
* `!title` - Get the current title. Enabled with `title/enabled`.
* `!title <title>` - Update the title to be `<title>`.
* `!game` - Get the current game. Enabled with `game/enabled`.
* `!game <game>` - Update the game to be `<game>`.

#### `!command` command

Allows editing custom commands.

You enable custom command administration by setting `command/enabled` to `true`.

A custom command is a prefix the bot responds to with a templated message.

Available commands:

* `!command edit <name> <template...>` - Set the command `<name>` to respond with `<template...>`.
* `!command clear-group <name>` - Clear the group for command `<name>`.
* `!command group <name>` - Get the group the given command belongs to.
* `!command group <name> <group>` - Set the command `<name>` to be in the group `<group>`.
* `!command delete <name>` - Delete the command named `<name>`.
* `!command rename <from> <to>` - Rename the command `<from>` to `<to>`.

Template variables that can be used in `<template...>`:

* `{{count}}` - The number of times the command has been invoked.
* `{{name}}` - The user who said the word.
* `{{target}}` - The channel where the word was sent.

#### `!alias` command

Allows setting custom aliases.
Aliases are prefixes that when invoked they will be expanded when processed by the bot.

For example, lets say we have an alias named `!sr` configured to `!song request {{rest}}`.
This would allow us to invoke `!sr don't call me` and it would be processed as `!song request don't call me`.

Available commands:

* `!alias edit <name> <what>` - Set the command `<name>` to alias to `<what>`.
* `!alias clear-group <name>` - Clear the group for alias `<name>`.
* `!alias group <name>` - Get the group the given alias belongs to.
* `!alias group <name> <group>` - Set the alias `<name>` to be in the group `<group>`.
* `!alias delete <name>` - Delete the command named `<name>`.
* `!alias rename <from> <to>` - Rename the command `<from>` to `<to>`.

Template variables that can be used in `<what>`:

* `{{rest}}` - The rest of the line being passed in.
* `{{name}}` - The user who invoked the alias.
* `{{target}}` - The channel where the alias was invoked.

###### Deprecated configuration `[[aliases]]`

Aliases used to be specified in the configuration.
If these are still present, the bot will migrate those aliases into the database and post a warning at startup.

The configuration used to look like this:

```toml
[[aliases]]
match = "!sr"
replace = "!song request {{rest}}"

[[aliases]]
match = "!sl"
replace = "!song list {{rest}}"

[[aliases]]
match = "!volume"
replace = "!song volume {{rest}}"
```

Now it's all handled using the `!alias` command.

#### `!afterstream` command

You enable the `!afterstream` command by setting `afterstream/enabled` to `true`.

Enabled adding afterstream messages.

Afterstream messages keeps track of who added them and when.

Available commands:

* `!afterstream <message>` - Leaves the `<message>` in the afterstream queue.

Afterstreams that are posted are made available in the UI at: http://localhost:12345/after-streams


#### `!song` command

You enable the `!song` command by setting `song/enabled` to `true`.

Enables song playback through Spotify.

Available commands:

* `!song request spotify:track:<id>` - Request a song through a Spotify URI.
* `!song request https://open.spotify.com/track/<id>` - Request a song by spotify URL.
* `!song request <search>` - Request a song by searching for it. The first hit will be used.
* `!song skip` - Skip the current song.
* `!song play` - Play the current song.
* `!song pause` - Pause the current song.
* `!song toggle` - Toggle the current song (Pause/Play).
* `!song volume` - Get the current volume.
* `!song volume <volume>` - Set the current volume to `<volume>`.
* `!song length` - Get the current length of the queue.
* `!song current` - Get information on the current song.
* `!song delete last` - Delete the last song in the queue.
* `!song delete last <user>` - Delete the last song in the queue added by the given `<user>`.
* `!song delete mine` - A user is allowed to delete the last song that _they_ added.
* `!song delete <position>` - Delete a song at the given position.
* `!song list` - Get the next three songs.
* `!song list <n>` - Get the next `<n>` songs.
* `!song theme <name>` - Play the specified theme song.
* `!song close [reason]` - Close the song queue with an optional `[reason]`.
* `!song open` - Open the song queue.
* `!song promote <number>` - Promote the song at the given position `<number>` in the queue.
* `!song when` - Find out when your song will play.
* `!song when <user>` - Find out when the song for a specific user will play.

#### `!clip` command

You enable the `!clip` command by setting `clip/enabled` to `true`.

The `!clip` command enables the `!clip` command.

This command has a cooldown determined by the `[irc] clip_cooldown` configuration key (see above).

#### `!8ball` command

You enable the `!8ball` command by setting `8ball/enabled` to `true`.

Enables the Magic `!8ball` command. Cause it's MAGIC.

#### `currency`

Enables a loyalty currency system and a couple of commands.

A currency is enabled by adding the following to your configuration:

```toml
[currency]
name = "thingies"
```

Enabled commands depend on the `name` of your currency, so we are gonna assume the currency is currently named `thingies`:

- `!thingies` - Get your current balance.
- `!thingies give <user> <amount>` - Give `<user>` `<amount>` of the given currency. This will _transfer_ the specified amount from your account to another.
- `!thingies boost <user> <amount>` - Give the specified `<user>` an `<amount>` of currency. Can be negative to take away.
- `!thingies windfall <amount>` - Give away `<amount>` currency to all current viewers.
- `!thingies show <user>` - Show the amount of currency for the given user.

#### `!swearjar` command

You enable the `!swearjar` command by setting `swearjar/enabled` to `true`.

This also requires the `!currency` command to be enabled.

Available commands:

* `!swearjar` - Anyone can invoke the swearjar to reward all viewers with some currency from the streamer when they swear.

#### `!countdown` command

You enable the `!countdown` command by setting `countdown/enabled` to `true`.

The `!countdown` command allows setting a countdown and a corresponding template, that will be written to a file while the countdown is active.

The following settings are required:

* `countdown/path` - The path to write the countdown to.

Available commands:

* `!countdown set <duration> <template>` - Set a countdown, available template variables are `{{remaining}}`, `{{duration}}`, and `{{elapsed}}`.
  - Example: `!countdown set 5m I'll be live in {{remaining}}`
  - Example: `!countdown set 1m Getting food, back in {{remaining}}`
* `!countdown clear` - Clear the current countdown.

#### `!water` command

You enable the `!water` command by setting `water/enabled` to `true`.

Available commands:

* `!water` - A user can remind the streamer to drink water and will be rewarded one unit of stream currency for every minute since last reminder.
* `!water undo` - Undos the last water reminder and refunds the reward.

#### `!promo` command

You enable the `!promo` command by setting `promo/enabled` to `true`.

The following settings are required:

* `promo/frequency` - The highest frequency at which promotions are posted.

Available commands:

* `!promo list` - List all available promotions.
* `!promo edit <id> <frequency> <what>` - Set the promotion identified by `<id>` to send the message `<what>` every `<frequency>`.
  - Example: `!promo edit discord 30m Hey, did you know I have a Discord? Join it at http://example.com!`
* `!promo clear-group <name>` - Clear the group for promotion `<name>`.
* `!promo group <name>` - Get the group the given promotion belongs to.
* `!promo group <name> <group>` - Set the promotion `<name>` to be in the group `<group>`.
* `!promo delete <id>` - Delete the promotion with the given id.
* `!promo rename <from> <to>` - Delete the promotion with the given id.

#### `!gtav` command

You enable the `!gtav` command by setting `gtav/enabled` to `true`.

The `gtav` module enables support for [`ChaosMod`](https://github.com/udoprog/ChaosMod).

This has a lot of settings to tweak, go into `Settings` and search for `gtav` to find out more.
It also enables a lot of commands.
Go to https://bit.ly/gtavchaos for a full list.

All of these have different effects and costs (which requires the `!currency` command).

#### `!speedrun` command

You enable the `!speedrun` command by setting `speedrun/enabled` to `true`.

* `!speedrun game <game> [filters]` - List leaderboards for a specific game.
  * Example: `!speedrun game gtav --category 100%`
  * Available `[filters]` are:
    * `--user <name>` - Limit results to the given user.
    * `--abbrev` - Abbreviate sub-categories (e.g. `100% No Mission Skips` becomes `100% NMS`).
    * `--category <name>` - Limit results to the given category.
    * `--sub-category <name>` - Limit results to the given sub-category.
    * `--misc` - Include misc categories.
    * `--misc-only` - Only list misc categories.
* `!speedrun personal-bests <user> [filters]` - List leaderboards for a specific game.
  * Example: `!speedrun personal-bests setbac --game gtav`
  * Available `[filters]` are:
    * `--game <game>` - Limit results to the given game.
    * `--abbrev` - Abbreviate sub-categories (e.g. `100% No Mission Skips` becomes `100% NMS`).
    * `--per-level` - Show per-level personal bests.
    * `--level <level>` - Filter by the given level.
    * `--category <name>` - Limit results to the given category.
    * `--sub-category <name>` - Limit results to the given sub-category.
    * `--misc` - Include misc categories.
    * `--misc-only` - Only list misc categories.

#### `!time` command

You enable the `!time` command by setting `time/enabled` to `true`.

The `!time` command shows the current time of the streamer (in the specified time zone).

Available settings are:

* `time/enabled` - if the command is enabled or not.
* `time/timezone` - for setting the current time zone.
* `time/template` - a template with the following variables:
  * `{{time}}` - A HH:MM::SS formatted timestamp.
  * `{{offset}}` - The timezone offset in UTC-format, like: `+0230`.
  * `{{day}}`, `{{month}}`, `{{year}}` - Day, month, and year.
  * `{{rfc2822}}` - An RFC-2822 formatted date time, like: `Thu, 01 Sep 2016 10:11:12 -0500`.

#### `!poll` command

You enable the `!poll` command by setting `poll/enabled` to `true`.

Chat votes based on keywords determined by you when running the poll.

This enables the following commands:

* `!poll run <question> <options...>` - Runs a poll.
  * `<question>` must be a quoted question, like `"Should I eat breakfast?"`.
  * `<options...>` is a collection of options. Like `yes no ?="don't care"`.
    Note the option `?` which is named `don't care` in the results.
  * Example: `!poll run "Should I eat breakfast" yes no ???="don't care"` - chat can now vote by typing `yes`, `no`, or `???`.
* `!poll close [question]` - Closes a poll. If `[question]` is not specified, closes the last poll opened.

#### `!weather` command

You enable the `!weather` command by setting `weather/enabled` to `true`.

This also requires `weather/api-key` to be set with a valid [OpenWeatherMap] API key.
This requires you to register an account, but is otherwise free for limited use.

Chat votes based on keywords determined by you when running the poll.

This enables the following commands:

* `!weather current [location...]` - Query for weather data for a specific location.
  * Example: `!weather current` - Would query for weather data for the location that the streamer has configured `weather/location`.

[OpenWeatherMap]: https://openweathermap.org

## Migrating from 0.2 to 0.3

SetMod 0.3 completely removes the need for any configuration files.
Everything is now managed through the `Settings` page in the UI.

We've also moved where we expect the database to be, so if you have an old `0.2` database and a `config.toml` file you'll have to move it like this:

1. Install SetMod `0.3.x`
2. Start SetMod through the Start Menu.
3. When SetMod is running it has a systray icon.
   Click on it and select `Open Directory...`.
4. Quit SetMod.
5. Copy the following files into the directory that you just opened:
   * Your old `config.toml`
   * Your old `*.sql` database, which must be renamed to `setmod.sql`.
6. Start SetMod again. This time it will migrate any existing configuration.
7. Remove `config.toml`.