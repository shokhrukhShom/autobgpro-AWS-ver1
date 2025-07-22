# forms.py
from django import forms
from .models import Uploaded_Pictures


"""
#cannot save multible images only single img

class UploadPictureForm(forms.ModelForm):
	class Meta:
		model = Uploaded_Pictures
		fields = [ 'car_pictures', ]
		widget = {
			'car_pictures' : forms.ClearableFileInput(attrs = {
				'allow_multiple_selected' : True
			})
		}

"""