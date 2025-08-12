from django.apps import AppConfig


class RembgappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rembgApp'

    def ready(self):

        import rembgApp.signals
