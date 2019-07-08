use crate::{
    api, auth, command, module,
    prelude::*,
    stream_info,
    utils::{Cooldown, Duration},
};
use parking_lot::RwLock;
use std::sync::Arc;

/// Handler for the `!clip` command.
pub struct Clip<'a> {
    pub enabled: Arc<RwLock<bool>>,
    pub stream_info: stream_info::StreamInfo,
    pub clip_cooldown: Arc<RwLock<Cooldown>>,
    pub twitch: &'a api::Twitch,
}

impl command::Handler for Clip<'_> {
    fn scope(&self) -> Option<auth::Scope> {
        Some(auth::Scope::Clip)
    }

    fn handle<'slf: 'a, 'ctx: 'a, 'a>(
        &'slf mut self,
        ctx: command::Context<'ctx>,
    ) -> future::BoxFuture<'a, Result<(), failure::Error>> {
        Box::pin(async move {
            if !*self.enabled.read() {
                return Ok(());
            }

            if !self.clip_cooldown.write().is_open() {
                ctx.respond("A clip was already created recently");
                return Ok(());
            }

            let stream_info = self.stream_info.data.read();

            let user_id = match stream_info.user.as_ref() {
                Some(user) => user.id.to_string(),
                None => {
                    log::error!("No information available on the current stream");
                    ctx.respond("Cannot clip right now, stream is not live.");
                    return Ok(());
                }
            };

            let title = match ctx.rest().trim() {
                "" => None,
                other => Some(other.to_string()),
            };

            let twitch = self.twitch.clone();
            let user = ctx.user.clone();

            ctx.spawn(async move {
                match twitch.create_clip(user_id.as_str()).await {
                    Ok(Some(clip)) => {
                        user.respond(format!(
                            "Created clip at {}/{}",
                            api::twitch::CLIPS_URL,
                            clip.id
                        ));

                        if let Some(_title) = title {
                            log::warn!("Title was requested, but it can't be set (right now)")
                        }
                    }
                    Ok(None) => {
                        user.respond("Failed to create clip, sorry :(");
                        log::error!("created clip, but API returned nothing");
                    }
                    Err(e) => {
                        user.respond("Failed to create clip, sorry :(");
                        log_err!(e, "error when posting clip");
                    }
                }
            });

            Ok(())
        })
    }
}

pub struct Module;

impl super::Module for Module {
    fn ty(&self) -> &'static str {
        "clip"
    }

    /// Set up command handlers for this module.
    fn hook(
        &self,
        module::HookContext {
            handlers,
            settings,
            futures,
            stream_info,
            twitch,
            ..
        }: module::HookContext<'_, '_>,
    ) -> Result<(), failure::Error> {
        let settings = settings.scoped("clip");
        let mut vars = settings.vars();

        handlers.insert(
            "clip",
            Clip {
                enabled: vars.var("enabled", true)?,
                stream_info: stream_info.clone(),
                clip_cooldown: vars
                    .var("cooldown", Cooldown::from_duration(Duration::seconds(30)))?,
                twitch,
            },
        );

        futures.push(vars.run().boxed());
        Ok(())
    }
}
