import pytch
import pytch.microbit as microbit

# This line and everything below it reminds you how to set up Sprites
# and the code in them, and shows you how to interact with the
# micro:bit.  You can find more ways to use the micro:bit with the
# help sidebar.  You can change or delete anything you don't need.
# You can also delete the green-burst or python-logo images if you
# don't need them for your project.


class DoubleSnake(pytch.Sprite):
    Costumes = ["python-logo.png"]

    @pytch.when_this_sprite_clicked
    def say_hello(self):
        microbit.scroll_text("Hello!")
        microbit.play_music("BA_DING")

    @microbit.when_button_pressed("a")
    @microbit.when_gesture_detected("left")
    def move_left(self):
        self.change_x(-10)

    @microbit.when_button_pressed("b")
    @microbit.when_gesture_detected("right")
    def move_right(self):
        self.change_x(10)


class GreenBurst(pytch.Stage):
    Backdrops = ["green-burst.jpg"]
