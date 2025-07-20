#added
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static

from django.urls import path
from . import views



urlpatterns = [
    path("", views.login_view, name="login"),
    path("register", views.register, name="register"),
    path("logout", views.logout_view, name="logout"),
    #path("mainPage", views.mainPage, name="mainPage"), # this path not being used currently todo: delete/remove?

    path("uploadImg", views.uploadImg, name="uploadImg"), #uploadImag.html
    path("rmbg", views.rmbg, name="rmbg"), #uploadImag.html

    #API Routes
    path("imageProcessing", views.imageProcessing, name="imageProcessing"), #AJAX API request processing for POST, GET, PUT, DELETE
    path("save_image_edit", views.save_image_edit, name="save_image_edit"),
    path("save_metadata", views.save_metadata, name="save_metadata"),
    path('get_metadata/<int:project_id>/', views.get_metadata, name='get_metadata'),
    path('upload_logo/', views.upload_logo, name='upload_logo'),
    path('design_template/', views.design_template, name='design_template'),
    path('get_templates/', views.get_templates, name='get_templates'),
    path('get_template/<int:template_id>/', views.get_template_metadata, name='get_template_metadata'),  
]

