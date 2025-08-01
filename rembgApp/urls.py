#added
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from . import webhooks


from django.urls import path
from . import views
from django.conf import settings


urlpatterns = [
    
    #landing page
    path("", views.landing_page, name="landing_page"),
    path("q", views.layout_landing, name="layout_landing"),
    path("auth", views.login_view, name="login"),
    path("register", views.register, name="register"),
    path("logout", views.logout_view, name="logout"),
    path("register/success", views.register_success, name="register/success"),
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
    path('upload-background/', views.upload_background, name='upload_background'),  
    path('background_upload_page/', views.background_upload_page, name='background_upload_page'),  
    path('delete-background/<str:image_id>/', views.delete_background, name='delete_background'),
    
    path("password_reset/", auth_views.PasswordResetView.as_view(template_name="rembgApp/password_reset.html"), name="password_reset"),
    path("password_reset/done/", auth_views.PasswordResetDoneView.as_view(template_name="rembgApp/password_reset_done.html"), name="password_reset_done"),
    path("reset/<uidb64>/<token>/", auth_views.PasswordResetConfirmView.as_view(template_name="rembgApp/password_reset_confirm.html"), name="password_reset_confirm"),
    path("reset/done/", auth_views.PasswordResetCompleteView.as_view(template_name="rembgApp/password_reset_complete.html"), name="password_reset_complete"),
    path("forgot-username/", views.forgot_username, name="forgot_username"),
    path("register/cancel", views.register_cancel, name="register_cancel"),
    path("billing_portal", views.billing_portal, name="billing_portal"),
    path('webhooks/stripe/', webhooks.stripe_webhook, name='stripe_webhook'),
    path('api/usage/', views.api_usage, name='api_usage'),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

