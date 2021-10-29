from django.contrib import sitemaps
from django.urls import reverse


class StaticViewSitemap(sitemaps.Sitemap):
    priority = 0.5
    changefreq = "weekly"

    def items(self):
        return (
            "home",
            "about",
            "help",
            "privacy_policy",
            "terms_of_service",
            "account_login",
        )

    def location(self, item):
        return reverse(item)
