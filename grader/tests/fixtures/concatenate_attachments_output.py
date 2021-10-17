from grader.services import ConcatOutput, StringifiedAttachment


OUTPUT = ConcatOutput(
    data=[
        StringifiedAttachment(
            header=["Attachment One", "=============="],
            content=[
                "\ufeffThis is attachment one?",
                "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).",
            ],
        ),
        StringifiedAttachment(
            header=["Attachment Two", "=============="],
            content=[
                "\ufeffThis is attachment two.",
                "",
                "",
                "Where can I get some?",
                "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.",
            ],
        ),
        StringifiedAttachment(
            header=["This is attachment three", "========================"],
            content=[
                "This is attachment three",
                "And it is a google slide",
                "How about that?",
                "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.",
                "What do you think?",
                "Your answer:",
                "_________",
            ],
        ),
    ]
)

