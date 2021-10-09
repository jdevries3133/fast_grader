from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class FastGraderSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Temporary work-around for: https://github.com/pennersr/django-allauth/issues/2467
    """

    def get_app(self, request, provider):
        # NOTE: Avoid loading models at top due to registry boot...
        from allauth.socialaccount.models import SocialApp
        from allauth.socialaccount import app_settings

        config = app_settings.PROVIDERS.get(provider, {}).get('APP')
        if config:
            app = SocialApp(provider=provider)
            for field in ['client_id', 'secret', 'key']:
                setattr(app, field, config.get(field))

            # 3 added lines here
            app.key = app.key or "unset"
            app.name = app.name or provider
            app.save()

        else:
            app = SocialApp.objects.get_current(provider, request)
        return app
