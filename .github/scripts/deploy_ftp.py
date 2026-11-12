"""Publish only the website files using unencrypted FTP (credentials are exposed in transit)."""
import ftplib
import os
import re
from pathlib import Path
import sys


def main():
    required = ('FTP_SERVER', 'FTP_USERNAME', 'FTP_PASSWORD', 'FTP_DIR')
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        for name in missing:
            print(f'::error::Missing repository secret: {name}', file=sys.stderr)
        return 1

    stage = 'checking configuration'
    try:
        port = int(os.environ.get('FTP_PORT') or '21')
        if not 1 <= port <= 65535:
            raise ValueError('FTP_PORT must be between 1 and 65535')
        with ftplib.FTP(timeout=30) as ftp:
            stage = 'connecting to server'
            ftp.connect(os.environ['FTP_SERVER'], port)
            stage = 'logging in'
            ftp.login(os.environ['FTP_USERNAME'], os.environ['FTP_PASSWORD'])
            stage = 'opening FTP_DIR'
            ftp.cwd(os.environ['FTP_DIR'])
            ftp.voidcmd('TYPE I')

            def upload_tree(local_dir):
                for path in sorted(local_dir.iterdir()):
                    if path.is_dir():
                        try:
                            ftp.cwd(path.name)
                        except ftplib.error_perm:
                            ftp.mkd(path.name)
                            ftp.cwd(path.name)
                        upload_tree(path)
                        ftp.cwd('..')
                    elif path.is_file():
                        # Only immutable, hash-named catalog thumbnails can safely be skipped.
                        # If SIZE is unsupported or the size differs, upload normally.
                        if local_dir == Path('assets/catalog') and re.fullmatch(r'[0-9a-f]{20}\.(jpg|png)', path.name):
                            try:
                                if ftp.size(path.name) == path.stat().st_size:
                                    continue
                            except ftplib.Error:
                                pass
                        with path.open('rb') as source:
                            ftp.storbinary(f'STOR {path.name}', source)
                        print(f'Uploaded {path.as_posix()}')

            stage = 'uploading site files'
            for filename in ('index.html', 'styles.css', 'script.js'):
                with open(filename, 'rb') as source:
                    ftp.storbinary(f'STOR {filename}', source)
                print(f'Uploaded {filename}')
            for directory in ('assets', 'data'):
                stage = f'uploading {directory}'
                try:
                    ftp.cwd(directory)
                except ftplib.error_perm:
                    ftp.mkd(directory)
                    ftp.cwd(directory)
                upload_tree(Path(directory))
                ftp.cwd('..')
        print('FTP deployment completed.')
        return 0
    except (ftplib.Error, OSError, EOFError, ValueError) as exc:
        print(f'::error::FTP deployment failed while {stage}: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
