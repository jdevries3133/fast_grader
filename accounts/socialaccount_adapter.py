from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class FastGraderSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Temporary work-around for:
    https://github.com/pennersr/django-allauth/issues/2467
    """

    def get_app(self, request, provider):
        # NOTE: Avoid loading models at top due to registry boot...
        from allauth.socialaccount.models import SocialApp
        from allauth.socialaccount.adapter import app_settings

        config = app_settings.PROVIDERS.get(provider, {}).get("APP")  # type: ignore
        if config:
            if (
                app_settings.STORE_TOKENS  # type: ignore
                and SocialApp.objects.filter(provider=provider).exists()
            ):
                app = SocialApp.objects.get(provider=provider)

            # if the SocialApp is defined in settings, it's possible that the
            # database model does not yet exist. We are *potentially* going to
            # create it now.
            else:
                app = SocialApp(provider=provider)
                for field in ["client_id", "secret", "key", "certificate_key"]:
                    setattr(app, field, config.get(field))

                # if refresh tokens are not being stored in the database, we
                # won't store the SocialApp in the database either. Doing so
                # would put secrets into the database, and the user who isn't
                # saving refresh tokens might not want that.

                # More importantly, though, it is only necessaray for the
                # SocialApp object to exist in the database when we are going
                # to save refresh tokens, because refresh tokens are
                # foreign-key-related to the SocialApp.
                if app_settings.STORE_TOKENS:  # type: ignore
                    app.save()
        else:
            app = SocialApp.objects.get_current(provider, request)
        return app
