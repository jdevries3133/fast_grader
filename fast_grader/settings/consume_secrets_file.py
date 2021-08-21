try:
    from .secrets import *  # type: ignore
except ImportError:
    from .create_secrets_file import main as create_secrets
    print("Your secrets file does not exist yet. Let's set it up now.")
    create_secrets()
    from .secrets import *  # type: ignore
