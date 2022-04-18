import pytest


@pytest.fixture
def sample_assignments():
    return [
        {
            "id": 1,
            "state": "PUBLISHED",
            "materials": [
                {
                    "driveFile": {
                        "driveFile": {
                            "id": "1L8cFSLvw-0byo0Oek0CKoD5sYNI0WoApg-jLBzRbBVs",
                            "title": "Week 29 Day 1: Bucket Drumming",
                            "alternateLink": "https://docs.google.com/presentation/d/1L8cFSLvw-0byo0Oek0CKoD5sYNI0WoApg-jLBzRbBVs/edit?usp=drive_web",
                            "thumbnailUrl": "https://lh3.google.com/GEDmF3FRypA4zkGrCVR8sStnpM7DjxLW7vUf_8hjo1zhPpQZF41JRnJR_VWJWGeEMZ6pDJRtYMngXPC2OLfj9bLWOKR1pl1g18MY=s200",
                        },
                        "shareMode": "STUDENT_COPY",
                    },
                }
            ],
        },
        {
            "id": 2,
            "state": "PUBLISHED",
            "materials": [
                {
                    "form": {
                        "formUrl": "https://docs.google.com/forms/d/e/1FAIpQLScJpA0rk1SMkRRT_5bvJ4XLOd5v11QDDXBzGVF5Oxn12MQ5-Q/viewform",
                        "title": "Week 21 Day 1 Do-Now",
                        "thumbnailUrl": "https://lh5.googleusercontent.com/a7JCAG--5YlSSlgAAi90pE2LQna5WJ2FFmdoZMW4wCZFS4TvXTZOurJpct3Ih7CW058JF9Yy3OQ=w90-h90-p",
                    }
                }
            ],
        },
        {
            "id": 3,
            "state": "PUBLISHED",
            "materials": [
                {
                    "driveFile": {
                        "driveFile": {
                            "id": "1prTj83G4iGdHNFq4Sp3WIMQiglwmq0QU5m8Wzs13UU8",
                            "title": "Week 18 Day 2",
                            "alternateLink": "https://docs.google.com/presentation/d/1prTj83G4iGdHNFq4Sp3WIMQiglwmq0QU5m8Wzs13UU8/edit?usp=drive_web",
                            "thumbnailUrl": "https://lh3.google.com/mGZkbrsUTMxCk6VIonPNWEwgy-uFRvKrGGEqT6oua2hTO-cDKcmeejLD-6ohX4WmitqVGW1bqJ6AFJmYZ6--g0PI8ao44NchgZgf=s200",
                        },
                        "shareMode": "STUDENT_COPY",
                    }
                },
                {
                    "link": {
                        "url": "https://virtualpiano.net/music-sheets/",
                        "title": "Virtual Piano Music Sheets | World's Largest Library | Virtual Piano Sheets",
                        "thumbnailUrl": "https://classroom.google.com/webthumbnail?url=https://virtualpiano.net/music-sheets/",
                    }
                },
            ],
        },
        {
            "random": "invalid data",
            "that  will": "cause key errors",
            "materials": ["ok"],
        },
    ]
