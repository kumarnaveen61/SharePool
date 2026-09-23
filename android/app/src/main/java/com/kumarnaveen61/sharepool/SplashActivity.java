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

        // 1) Start the animated rings immediately
        ImageView rings = findViewById(R.id.splashRings);
        if (rings.getDrawable() instanceof AnimatedVectorDrawable) {
            AnimatedVectorDrawable avd = (AnimatedVectorDrawable) rings.getDrawable();
            avd.start();
        }

        // 2) Wordmark zooms in at 3.8s
        final TextView wordmark = findViewById(R.id.splashWordmark);
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                if (wordmark == null) return;
                ObjectAnimator alpha = ObjectAnimator.ofFloat(wordmark, "alpha", 0f, 1f);
                ObjectAnimator scaleX = ObjectAnimator.ofFloat(wordmark, "scaleX", 0.2f, 1f);
                ObjectAnimator scaleY = ObjectAnimator.ofFloat(wordmark, "scaleY", 0.2f, 1f);

                AnimatorSet set = new AnimatorSet();
                set.playTogether(alpha, scaleX, scaleY);
                set.setDuration(700);
                set.setInterpolator(new OvershootInterpolator(1.1f));
                set.start();
            }
        }, 3800);

        // 3) Tagline fades in at 4.5s
        final TextView tagline = findViewById(R.id.splashTagline);
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                if (tagline == null) return;
                ObjectAnimator alpha = ObjectAnimator.ofFloat(tagline, "alpha", 0f, 1f);
                alpha.setDuration(700);
                alpha.start();
            }
        }, 4500);

        // 4) Launch MainActivity at 5.5s
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                startActivity(new Intent(SplashActivity.this, MainActivity.class));
                finish();
            }
        }, 5500);
    }
}
