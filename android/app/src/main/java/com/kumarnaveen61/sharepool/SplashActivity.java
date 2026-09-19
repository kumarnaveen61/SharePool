package com.kumarnaveen61.sharepool;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.Intent;
import android.graphics.drawable.AnimatedVectorDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.animation.OvershootInterpolator;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class SplashActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        // 1) Start the animated vector rings immediately
        ImageView rings = findViewById(R.id.splashRings);
        if (rings.getDrawable() instanceof AnimatedVectorDrawable) {
            AnimatedVectorDrawable avd = (AnimatedVectorDrawable) rings.getDrawable();
            avd.start();
        }

        // 2) After 500ms, zoom in + fade in the tagline
        final TextView tagline = findViewById(R.id.splashTagline);
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                ObjectAnimator alpha = ObjectAnimator.ofFloat(tagline, "alpha", 0f, 1f);
                ObjectAnimator scaleX = ObjectAnimator.ofFloat(tagline, "scaleX", 0.2f, 1f);
                ObjectAnimator scaleY = ObjectAnimator.ofFloat(tagline, "scaleY", 0.2f, 1f);

                AnimatorSet set = new AnimatorSet();
                set.playTogether(alpha, scaleX, scaleY);
                set.setDuration(1200);
                set.setInterpolator(new OvershootInterpolator(1.1f));
                set.start();
            }
        }, 500);

        // 3) After 2s total, launch MainActivity
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                startActivity(new Intent(SplashActivity.this, MainActivity.class));
                finish();
            }
        }, 2000);
    }
}