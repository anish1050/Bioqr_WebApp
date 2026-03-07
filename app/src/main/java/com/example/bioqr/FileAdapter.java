package com.example.bioqr;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ImageView;
import android.widget.TextView;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class FileAdapter extends BaseAdapter {

    private Context context;
    private List<FileManagerActivity.FileItem> files;
    private LayoutInflater inflater;

    public FileAdapter(Context context, List<FileManagerActivity.FileItem> files) {
        this.context = context;
        this.files = files;
        this.inflater = LayoutInflater.from(context);
    }

    @Override
    public int getCount() {
        return files.size();
    }

    @Override
    public Object getItem(int position) {
        return files.get(position);
    }

    @Override
    public long getItemId(int position) {
        return files.get(position).getId();
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        ViewHolder holder;

        if (convertView == null) {
            convertView = inflater.inflate(R.layout.item_file, parent, false);
            holder = new ViewHolder();
            holder.ivFileIcon = convertView.findViewById(R.id.ivFileIcon);
            holder.tvFileName = convertView.findViewById(R.id.tvFileName);
            holder.tvFileSize = convertView.findViewById(R.id.tvFileSize);
            holder.tvFileDate = convertView.findViewById(R.id.tvFileDate);
            holder.tvFileType = convertView.findViewById(R.id.tvFileType);
            convertView.setTag(holder);
        } else {
            holder = (ViewHolder) convertView.getTag();
        }

        FileManagerActivity.FileItem file = files.get(position);

        // Set file name
        holder.tvFileName.setText(file.getFilename());

        // Set file size
        holder.tvFileSize.setText(file.getSizeFormatted());

        // Set file type
        holder.tvFileType.setText(getFileTypeFromMimeType(file.getMimetype()));

        // Set file date
        holder.tvFileDate.setText(formatDate(file.getUploadedAt()));

        // Set file icon based on mime type
        holder.ivFileIcon.setImageResource(getFileIconResource(file.getMimetype()));

        return convertView;
    }

    private String getFileTypeFromMimeType(String mimeType) {
        if (mimeType == null) return "Unknown";

        if (mimeType.startsWith("image/")) return "Image";
        if (mimeType.startsWith("video/")) return "Video";
        if (mimeType.startsWith("audio/")) return "Audio";
        if (mimeType.startsWith("text/")) return "Text";
        if (mimeType.contains("pdf")) return "PDF";
        if (mimeType.contains("document")) return "Document";
        if (mimeType.contains("spreadsheet") || mimeType.contains("excel")) return "Spreadsheet";
        if (mimeType.contains("presentation") || mimeType.contains("powerpoint")) return "Presentation";
        if (mimeType.contains("zip") || mimeType.contains("rar") || mimeType.contains("archive")) return "Archive";

        return "File";
    }

    private int getFileIconResource(String mimeType) {
        if (mimeType == null) return R.drawable.ic_file_default;

        if (mimeType.startsWith("image/")) return R.drawable.ic_file_image;
        if (mimeType.startsWith("video/")) return R.drawable.ic_file_video;
        if (mimeType.startsWith("audio/")) return R.drawable.ic_file_audio;
        if (mimeType.startsWith("text/")) return R.drawable.ic_file_text;
        if (mimeType.contains("pdf")) return R.drawable.ic_file_pdf;
        if (mimeType.contains("document")) return R.drawable.ic_file_document;
        if (mimeType.contains("spreadsheet") || mimeType.contains("excel")) return R.drawable.ic_file_spreadsheet;
        if (mimeType.contains("presentation") || mimeType.contains("powerpoint")) return R.drawable.ic_file_presentation;
        if (mimeType.contains("zip") || mimeType.contains("rar") || mimeType.contains("archive")) return R.drawable.ic_file_archive;

        return R.drawable.ic_file_default;
    }

    private String formatDate(String dateString) {
        try {
            // Parse the date from server format (assuming ISO format)
            SimpleDateFormat serverFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
            SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.getDefault());

            Date date = serverFormat.parse(dateString);
            return displayFormat.format(date);
        } catch (ParseException e) {
            // If parsing fails, return the original string
            return dateString;
        }
    }

    private static class ViewHolder {
        ImageView ivFileIcon;
        TextView tvFileName;
        TextView tvFileSize;
        TextView tvFileDate;
        TextView tvFileType;
    }
}